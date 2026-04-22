/** Extraction module domain types — shared across stores, components, and pages. */

export type ExtractionRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type ExtractionRunType = 'NEW_DATE' | 'REVIEW' | 'MANUAL';

export interface ExtractionSchedule {
  id: string;
  clinic_id: string;
  auto_extract_enabled: boolean;
  extraction_time: string;
  review_times: string[];
  days_in_advance: number;
  review_days_in_advance: number;
  business_days_only: boolean;
  include_saturday: boolean;
  include_sunday: boolean;
  timezone: string;
  resolved_encargado_id?: string | null;
  resolved_encargado_name?: string | null;
  resolved_assignment_scope?: EncargadoAssignmentScope | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ExtractionRun {
  id: string;
  clinic_id: string;
  run_type: ExtractionRunType;
  status: ExtractionRunStatus;
  target_date: string;
  od_rows_count: number;
  inserted_rows_count: number;
  new_patients_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  run_slot_time?: string | null;
  template_name?: string | null;
  sheet_tab_name?: string | null;
  status_message?: string | null;
}

export interface Encargado {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  clinic_ids: string[];
  /** Legacy fallback only. Clinic assignment is source of truth. */
  client_ids: string[];
  resolved_assignment_scope?: EncargadoAssignmentScope;
  resolved_assignment_client_ids?: string[];
  resolved_assignment_clinic_ids?: string[];
  created_at: string | null;
  updated_at?: string | null;
}

export type EncargadoAssignmentScope = 'clinic' | 'client' | 'unassigned';

export interface EncargadoAnalytics {
  encargado_id: string;
  client_count: number;
  clinic_count?: number;
  resolved_assignment_scope?: EncargadoAssignmentScope;
  resolved_assignment_client_ids?: string[];
  resolved_assignment_clinic_ids?: string[];
  verification_volume: number;
  completion_rate: number;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface ExtractionRunFilters {
  clinic_ids?: string[];
  status?: ExtractionRunStatus | '';
  run_type?: ExtractionRunType | '';
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface ExtractionManualTriggerRequest {
  clinic_id: string;
  run_type: 'NEW_DATE' | 'REVIEW';
  date_from: string;
  date_to: string;
}

export interface ExtractionManualTriggerResponse {
  extraction_id?: string;
  dispatched?: number;
  message?: string;
  data?: {
    accepted?: boolean;
    message?: string;
    run?: ExtractionRun | null;
  };
}

export interface AssignClientsRequest {
  /** Legacy fallback only. Prefer clinic assignments. */
  client_ids: string[];
}

export interface AssignClinicsRequest {
  clinic_ids: string[];
}

export interface RunsResponse {
  runs?: ExtractionRun[];
  page?: number;
  total?: number;
  pages?: number;
}

export const extractionStatusColorMap: Record<string, string> = {
  COMPLETED: 'success',
  RUNNING: 'info',
  FAILED: 'error',
  PENDING: 'warning',
  SKIPPED: 'grey',
};

export function getExtractionStatusColor(status: string): string {
  return extractionStatusColorMap[status] ?? 'grey';
}
