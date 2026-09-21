import type { FetchMetadataResponse } from '@/utils/helpers/fetch-wrapper';

/** Metadata-preserving envelope shared by the authenticated onboarding calls. */
export type OnboardingResponse<T> = Omit<FetchMetadataResponse<T>, 'data'> & { data: T };

export type OnboardingCapabilityState = 'REQUIRED' | 'DEFAULT_ON' | 'OPTIONAL' | 'CONDITIONAL' | 'FORBIDDEN';
export type OnboardingVersionState = 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
export type OnboardingRescueState = 'IDLE' | 'REDEEMING' | 'READY' | 'SUBMITTING' | 'SUBMITTED' | 'REJECTED';

export type OnboardingDetectedQuestionKey =
  | 'last_check_source'
  | 'plan_period'
  | 'eligibility_only_carriers'
  | 'practices_in_scope'
  | 'extraction_window';
export type OnboardingWindowField = 'look_ahead_days' | 'day_counting' | 'working_days' | 'extraction_time' | 'review_times' | 'timezone';
export type OnboardingWindowQuestionKind = 'number' | 'choice' | 'weekdays' | 'time' | 'time_list' | 'timezone';
export type OnboardingNoteReadingMode = 'REVIEW_FIRST' | 'APPLY_AUTOMATICALLY';

export interface OnboardingQuestionOption {
  value: string | number | boolean | string[] | number[] | null;
  label: string;
  summary?: string;
}

export interface OnboardingDetectedQuestion {
  question_key: OnboardingDetectedQuestionKey;
  recommended: string | number | boolean | string[] | number[] | null;
  options: OnboardingQuestionOption[];
  basis: string;
  needs_client_confirmation: true;
}

export interface OnboardingWindowQuestion {
  field: OnboardingWindowField;
  title: string;
  help: string;
  kind: OnboardingWindowQuestionKind;
  recommended: string | number | number[] | string[] | null;
  minimum?: number;
  maximum?: number;
  options?: OnboardingQuestionOption[];
}

export interface OnboardingNoteReadingChoice {
  question_key: 'note_reading';
  title: string;
  summary: string;
  format_intro: string;
  example: string;
  format_outro: string;
  limits: string;
  recommended_mode: OnboardingNoteReadingMode;
  modes: Array<{ value: OnboardingNoteReadingMode; label: string; summary: string }>;
}

export interface OnboardingActivationState {
  classification_policy_ready: boolean;
  window_policy_ready: boolean;
}

export interface OnboardingQuestionsResponse {
  client_id: string;
  questions: OnboardingDetectedQuestion[];
  flags: string[];
  window_questions: OnboardingWindowQuestion[];
  note_reading: OnboardingNoteReadingChoice;
  activation: OnboardingActivationState;
}

export interface OnboardingWindowAnswers {
  enabled: boolean;
  look_ahead_days: number;
  day_counting: string;
  working_days: number[];
  extraction_time: string;
  review_times: string[];
  review_look_ahead_days: number;
  timezone: string;
}

export interface OnboardingNoteReadingAnswers {
  mode: OnboardingNoteReadingMode;
}

export interface OnboardingSealedAnswers {
  draft: OnboardingDraftRequest;
  window: OnboardingWindowAnswers;
  note_reading: OnboardingNoteReadingAnswers;
}

/** Closed client vocabulary echoed by the server; never an internal authoring name. */
export interface OnboardingClientChoices {
  archetype_key: string | null;
  optional_notes: string[];
  removed_notes: string[];
  fbd_scope: string | null;
  elg_window_days: number | null;
  cross_year_mode: string | null;
  period_policy?: Record<string, unknown> | null;
}

export interface OnboardingDiagnostic {
  code: string;
  subject_kind: string;
  message: string;
  client_choices?: OnboardingClientChoices | null;
}

/** Closed client submission; the only input the composer and the rescue form send. */
export interface OnboardingDraftRequest {
  archetype_key: string;
  optional_notes: string[];
  removed_notes: string[];
  fbd_scope: string;
  elg_window_days: number;
  cross_year_mode: string;
  period_policy?: Record<string, unknown> | null;
}

export interface OnboardingExpansionTrace {
  source_key: string;
  added_atom_keys: string[];
}

export interface OnboardingDraftCandidate {
  lifecycle: string;
  selected_atom_keys: string[];
  locked_atom_keys: string[];
  expansion_trace: OnboardingExpansionTrace[];
  capability_states: Record<string, OnboardingCapabilityState>;
  dependencies: Array<{ key: string; status: string }>;
}

export interface OnboardingDraftProjection {
  lifecycle: string;
  activatable: boolean;
  candidate: OnboardingDraftCandidate;
  profile: {
    fbd_scope: string;
    elg_window_days: number;
    cross_year_mode: string;
    period_policy?: Record<string, unknown> | null;
  };
  client_choices: OnboardingClientChoices;
}

/** Contract 1: authenticated draft admission (digest/canonical bytes stay receipt evidence). */
export interface OnboardingDraftResult {
  draft: OnboardingDraftProjection | null;
  canonical_bytes: string | null;
  digest: string | null;
  diagnostics: OnboardingDiagnostic[];
}

/** Contract 2: authenticated invite mint; the token lives only after the fragment. */
export interface OnboardingInviteLink {
  link: string;
  expires_at: string;
  expires_days: number;
}

/** Contract 3: public redeem echo, closed vocabulary plus remaining lifetime. */
export interface OnboardingRedemption {
  client_id: string;
  purpose: string;
  expires_at: string;
  ttl_seconds: number;
  diagnostics: OnboardingDiagnostic[];
}

export interface OnboardingSubmitReceipt {
  version_id: string;
  state: OnboardingVersionState;
  digest: string;
  canonical_bytes: string;
  etag: string | null;
  http_status: number;
}

/** Contract 4: public submit result, version identity plus operator receipt. */
export interface OnboardingSubmitResult {
  client_id: string;
  version: { version_id: string; version_number?: number; state: OnboardingVersionState };
  receipt: OnboardingSubmitReceipt;
  diagnostics: OnboardingDiagnostic[];
}

/** Contract 5: authenticated operator SOP projection for one submitted draft. */
export interface OnboardingSopProjection {
  sop_version: string;
  client_id: string;
  version: { version_id: string; version_number: number; blueprint_id: string; state: OnboardingVersionState };
  submitted_choices: OnboardingClientChoices;
  materialization: {
    selected_atom_keys: string[];
    locked_atom_keys: string[];
    expansion_trace: OnboardingExpansionTrace[];
    profile_digest: string | null;
  };
  receipt: {
    version_id: string;
    state: OnboardingVersionState;
    digest: string;
    canonical_bytes: string;
    actor_user_id: string | null;
    created_at: string | null;
    receipt_created_at: string | null;
  };
}

/** Typed public rejection: closed code plus the server's client-facing message. */
export class OnboardingPublicHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'OnboardingPublicHttpError';
  }
}
