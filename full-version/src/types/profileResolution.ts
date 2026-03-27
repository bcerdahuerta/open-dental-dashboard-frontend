export type ResolutionScope =
    | 'clinic_override'
    | 'client_assignment'
    | 'global_default'
    | 'legacy_client_profile'
    | 'unresolved';

export interface BaseProfile {
    id: string;
    profile_name: string;
    context_requirements: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
    verification_type?: string;
    target_status?: string;
    [key: string]: unknown;
}

export interface ClientAssignment {
    id: string;
    client_id: string;
    base_profile_id: string;
    verification_type: string;
    target_statuses: string[];
    precedence: number;
    context_rules?: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface ClinicOverride {
    id: string;
    clinic_id: string;
    client_assignment_id?: string | null;
    override_base_profile_id: string;
    verification_type: string;
    target_statuses: string[];
    precedence: number;
    context_rules?: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface ResolveExplainRequest {
    client_id: string;
    clinic_id: string;
    verification_type: string;
    verification_status: string;
    has_shortform?: boolean;
    context?: Record<string, unknown>;
}

export interface ResolveExplainNormalizedRequest extends ResolveExplainRequest {
    verification_status_normalized: string;
}

export interface ResolutionProfileRef {
    id: string | null;
    name: string | null;
}

export interface ResolutionCandidate {
    scope: ResolutionScope;
    precedence: number;
    matched: boolean;
    profile: ResolutionProfileRef;
    id?: string;
    reason?: string | null;
    verification_type?: string | null;
    target_statuses?: string[];
    status_match?: boolean;
    context_match?: boolean;
    base_profile_match?: boolean;
    base_requirements_match?: boolean;
    context_rules?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface ResolutionWinner {
    scope: Exclude<ResolutionScope, 'unresolved'>;
    id?: string;
    precedence: number;
    profile: ResolutionProfileRef;
    verification_type?: string | null;
    [key: string]: unknown;
}

export interface ResolveExplainResponse {
    winner: ResolutionWinner | null;
    candidates: ResolutionCandidate[];
    normalized_status: string;
    input?: Record<string, unknown>;
    matched_context?: Record<string, unknown>;
    unresolved?: boolean;
    [key: string]: unknown;
}

export interface SimulatorHistoryEntry {
    id: string;
    created_at: string;
    request: ResolveExplainRequest;
    normalized_request: ResolveExplainNormalizedRequest;
    response: ResolveExplainResponse;
}

// ============================================
// Form Types for Admin Editing Workflow
// ============================================

export type EditingMode = 'create' | 'edit';

export interface EditingState {
    isDirty: boolean;
    originalData: ClientAssignment | ClinicOverride | null;
    mode: EditingMode;
}

export interface ClientAssignmentFormData {
    client_id: string;
    base_profile_id: string;
    verification_type: string;
    target_statuses: string[];
    precedence: number;
    context_rules: {
        has_shortform: boolean;
    };
}

export interface ClinicOverrideFormData {
    clinic_id: string;
    client_assignment_id: string | null;
    override_base_profile_id: string;
    verification_type: string;
    target_statuses: string[];
    precedence: number;
    context_rules: {
        has_shortform: boolean;
    };
}

// Predefined catalog for target_statuses
export const PREDEFINED_TARGET_STATUSES = [
    'Max Out',
    'New Patient',
    'Recall',
    'Insurance',
] as const;

// Predefined verification types (from backend enum)
export const VERIFICATION_TYPES = [
    { value: 'ELG', label: 'Eligibility (ELG)' },
    { value: 'INS', label: 'Insurance (INS)' },
    { value: 'BNF', label: 'Benefits (BNF)' },
] as const;
