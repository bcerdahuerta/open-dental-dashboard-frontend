/** Writeback domain types — shared across stores, components, and pages. */

export type JobStatus =
  // v1 statuses
  | 'PENDING' | 'POLLING' | 'EXTRACTING' | 'EXECUTING' | 'DONE' | 'FAILED'
  // v2 event-pipeline statuses
  | 'EXTRACTED' | 'EXECUTED' | 'PARTIAL' | 'SYNCING' | 'SYNCED' | 'EXTRACT_FAILED' | 'SYNC_FAILED';

export interface WritebackJob {
    id: string;
    clinic_id: string;
    clinic_name: string | null;
    patient_name: string | null;
    row_index: number;
    spreadsheet_id: string;
    sheet_tab: string | null;
    matched_profile: string | null;
    status: JobStatus;
    attempt: number;
    max_attempts: number;
    error_message: string | null;
    error_category?: 'source_file_invalid' | null;
    retryable?: boolean | null;
    worker_id: string | null;
    priority: number;
    execution_id: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export interface StepLogEntry {
    step_type: string;
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    duration_ms: number | null;
    error_message: string | null;
    output: Record<string, unknown> | null;
}

export interface WritebackJobDetail extends WritebackJob {
    execution?: {
        id: string;
        status: string;
        started_at: string | null;
        completed_at: string | null;
        error_summary: string | null;
        step_logs: StepLogEntry[];
    };
}

export interface QueueStats {
    PENDING: number;
    POLLING: number;
    EXTRACTING: number;
    EXECUTING: number;
    DONE: number;
    FAILED: number;
    // v2 statuses
    EXTRACTED: number;
    EXECUTED: number;
    PARTIAL: number;
    SYNCING: number;
    SYNCED: number;
    EXTRACT_FAILED: number;
    SYNC_FAILED: number;
    total: number;
}

export interface JobsPagination {
    page: number;
    per_page: number;
    total: number;
    pages: number;
}

export interface PreviewReadyRow {
    row_index: number;
    sheet_tab: string;
    selection_key: string;
    patient_name: string;
    audit_status: string;
    is_not_found: boolean;
    matched_profile: string | null;
    matched_profile_id: string | null;
    verification_type: string;
    verification_status: string;
    preview_snapshot_token: string;
    preview_generated_at: string;
}

export interface SyncSelection {
    row_index: number;
    sheet_tab: string;
    selection_key: string;
    patient_name?: string;
}

export interface SyncClinicRequest {
    selections: SyncSelection[];
    preview_snapshot_token?: string | null;
    preview_generated_at?: string | null;
    preview_rows_found?: number;
}

export interface SyncClinicResult {
    clinic_id: string;
    rows_found_before_filter: number;
    rows_requested: number;
    rows_after_filter: number;
    jobs_created: number;
    jobs_deduplicated: number;
    jobs_failed_enqueue: number;
    current_snapshot_token: string;
    resolved_profiles: Array<{
        row_index: number;
        sheet_tab: string;
        matched_profile_id: string | null;
        matched_profile: string | null;
    }>;
}

export type WatchHealthStatus = 'active' | 'expiring_soon' | 'expired' | 'none';

export interface WatchHealth {
    status: WatchHealthStatus;
    expires_at: string | null;
    automatic_healthy: boolean;
}

export interface WritebackConfigResponse {
    id?: string;
    clinic_id?: string;
    writeback_mode: 'automatic' | 'manual';
    quiet_start: string | null;
    quiet_end: string | null;
    timezone: string;
    audit_column: string;
    upload_column: string;
    upload_done_value: string;
    include_not_found: boolean;
    watch_health?: WatchHealth;
    activation_status?: Record<string, unknown>;
}
