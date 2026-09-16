import type { FetchMetadataResponse } from '@/utils/helpers/fetch-wrapper';

export type WorkflowBuilderResponse<T> = Omit<FetchMetadataResponse<T>, 'data'> & { data: T };

export interface WorkflowBuilderDiagnostic {
  code: string;
  subject_kind: 'REQUEST' | 'CANDIDATE';
}

export interface WorkflowBuilderCandidate {
  lifecycle: 'DRAFT';
  selected_atom_keys: string[];
  locked_atom_keys: string[];
  expansion_trace: Array<{ source_key: string; added_atom_keys: string[] }>;
  capability_states: Record<string, 'REQUIRED' | 'DEFAULT_ON' | 'OPTIONAL' | 'CONDITIONAL' | 'FORBIDDEN'>;
  dependencies: Array<{ key: string; status: string }>;
  diagnostics: WorkflowBuilderDiagnostic[];
}

export interface WorkflowBuilderMaterialization {
  candidate: WorkflowBuilderCandidate | null;
  canonical_bytes: string | null;
  digest: string | null;
  diagnostics: WorkflowBuilderDiagnostic[];
}

export type WorkflowBuilderCapabilityState = 'REQUIRED' | 'DEFAULT_ON' | 'OPTIONAL' | 'CONDITIONAL' | 'FORBIDDEN';

export interface WorkflowBuilderArchetypeFacts {
  selected_atom_keys: string[];
  locked_atom_keys: string[];
  capability_states: Record<string, WorkflowBuilderCapabilityState>;
  dependencies: Array<{ key: string; status: string }>;
}

export interface WorkflowBuilderCatalog {
  catalog_version: string;
  archetypes: string[];
  packs: Record<string, string[]>;
  atoms: string[];
  archetype_facts: Record<string, WorkflowBuilderArchetypeFacts>;
}

export interface WorkflowBlueprintVersion {
  version_id: string;
  ordinal: number;
  state: 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
  content_digest: string;
  disposition: string | null;
  replacement_version_id: string | null;
  created_at: string;
}

export interface WorkflowBlueprintException {
  exception_id: string;
  base_version_id: string;
  base_version_digest: string;
  state: 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
  delta_digest: string;
  rationale: string;
  created_at: string;
}

export interface WorkflowBlueprintRoot {
  blueprint_id: string;
  origin: string;
  versions: WorkflowBlueprintVersion[];
  current_exception: WorkflowBlueprintException | null;
}

export interface WorkflowExceptionContext {
  base_version: WorkflowBlueprintVersion;
  current: WorkflowBlueprintException | null;
}

export interface WorkflowExceptionHistory {
  exceptions: WorkflowBlueprintException[];
  current_exception: WorkflowBlueprintException | null;
}

export interface WorkflowExceptionDelta {
  delta_version: 'blueprint-clinic-exception-delta-v1';
  add_atom_keys: string[];
  remove_atom_keys: string[];
  rationale: string;
}

export interface WorkflowCommand<T extends object> {
  readonly idempotencyKey: string;
  readonly body: Readonly<T>;
  readonly ifMatch?: string;
  readonly ifNoneMatch?: '*';
}

export type WorkflowCommandOutcome = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export type WorkflowCommandFailure = 'CONFLICT' | 'STALE' | 'UNAVAILABLE';

export interface WorkflowCommandReceipt<T> {
  readonly receiptId: number;
  readonly outcome: WorkflowCommandOutcome;
  readonly response?: WorkflowBuilderResponse<T>;
  readonly failure?: WorkflowCommandFailure;
  readonly retry: () => Promise<WorkflowCommandReceipt<T>>;
}

export type WorkflowVersionCommand = Record<string, never> | { reason_category: string };

export interface WorkflowDraftMaterial {
  contract_version: 'assisted-authoring-v1';
  canonical_bytes: string;
  digest: string;
}

export interface WorkflowAuthoringRequest {
  schema_version: 'assisted-authoring-v1';
  catalog_version: string;
  archetype_key: string;
  selected_pack_keys?: string[];
  selected_atom_keys?: string[];
  removed_atom_keys?: string[];
}
