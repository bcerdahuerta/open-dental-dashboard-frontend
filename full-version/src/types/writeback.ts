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
