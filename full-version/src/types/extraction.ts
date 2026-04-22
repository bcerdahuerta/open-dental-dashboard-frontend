/** Extraction module domain types — shared across stores, components, and pages. */

export type ExtractionRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type ExtractionRunType = 'NEW_DATE' | 'REVIEW' | 'MANUAL';
export type ExtractionHealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

export interface ExtractionEffectivePolicy {
  extraction_time: string;
  review_times: string[];
  days_in_advance: number;
  horizon_mode: 'business_days' | 'calendar_days' | string;
  working_days: number[];
  review_day_offsets: number[];
  slack_webhook?: string | null;
  slack_mentions?: string[];
  max_parallel_clinics: number;
  max_parallel_runs_per_clinic: number;
  timezone: string;
}

export interface ExtractionNotificationStatus {
  pending_count: number;
  failed_count: number;
  last_sent_at: string | null;
}

export interface ExtractionHealth {
  clinic_id: string;
  status: ExtractionHealthStatus;
  reason_code: string;
  reason_summary: string | null;
  consecutive_failure_count: number;
  overdue_run_count: number;
  pending_notification_count: number;
  failed_notification_count: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_od_error_at: string | null;
  last_event_at: string | null;
  computed_at: string | null;
  signal_snapshot_json: Record<string, unknown>;
}

export interface ExtractionOperationEvent {
  id: string;
  clinic_id: string;
  extraction_run_id?: string | null;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | string;
  message: string | null;
  payload_json: Record<string, unknown>;
  created_at: string | null;
}

export interface ExtractionRolloutCheck {
  clinic_id: string;
  clinic_name: string;
  client_id: string;
  client_name: string;
  dry_run: boolean;
  safe_for_rollout: boolean;
  blockers: string[];
  effective_policy: ExtractionEffectivePolicy;
  health: ExtractionHealth;
  notification_status: ExtractionNotificationStatus;
  recent_runs: ExtractionRun[];
  recent_events: ExtractionOperationEvent[];
}

export interface ExtractionSchedule {
  id: string;
  clinic_id: string;
  clinic_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
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
  horizon_mode?: string;
  working_days?: number[];
  review_day_offsets?: number[];
  slack_webhook?: string | null;
  slack_mentions?: string[];
  max_parallel_runs_per_clinic?: number | null;
  effective_policy?: ExtractionEffectivePolicy | null;
  notification_status?: ExtractionNotificationStatus | null;
  health?: ExtractionHealth | null;
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
  recent_events?: ExtractionOperationEvent[];
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
  resolved_clinic_ownership?: EncargadoClinicOwnership[];
  workload_summary?: EncargadoWorkloadSummary;
  capacity?: EncargadoCapacity;
  analytics_status?: EncargadoAnalyticsStatus;
  created_at: string | null;
  updated_at?: string | null;
}

export type EncargadoAssignmentScope = 'clinic' | 'client' | 'unassigned';

export type WorkforceMetricState = 'pending' | 'partial' | 'ready' | 'unavailable';

export interface EncargadoClinicOwnership {
  clinic_id: string;
  clinic_name: string;
  client_id: string;
  client_name: string;
  assignment_source: 'clinic' | 'client';
}

export interface EncargadoWorkloadSummary {
  resolved_client_count: number;
  resolved_clinic_count: number;
  direct_clinic_count: number;
  legacy_client_count: number;
}

export interface EncargadoCapacity {
  status: WorkforceMetricState;
  max_clinics: number | null;
  assigned_clinic_count: number;
  available_clinic_slots: number | null;
  utilization_ratio: number | null;
}

export interface EncargadoAnalyticsStatus {
  state: WorkforceMetricState;
  missing_metrics: string[];
  updated_at: string | null;
}

export interface EncargadoAnalyticsMetrics {
  client_count: number;
  clinic_count: number;
  verification_volume: number | null;
  completion_rate: number | null;
}

export interface EncargadoAnalytics {
  encargado_id: string;
  resolved_assignment_scope?: EncargadoAssignmentScope;
  resolved_assignment_client_ids?: string[];
  resolved_assignment_clinic_ids?: string[];
  resolved_clinic_ownership?: EncargadoClinicOwnership[];
  workload_summary?: EncargadoWorkloadSummary;
  capacity?: EncargadoCapacity;
  analytics_status?: EncargadoAnalyticsStatus;
  metrics: EncargadoAnalyticsMetrics;
}

export interface EncargadoAssignmentChange {
  encargado_id: string;
  changed: boolean;
  requested_clinic_ids: string[];
  previous_clinic_ids: string[];
  added_clinic_ids: string[];
  removed_clinic_ids: string[];
  affected_analytics_fields: string[];
}

export interface AssignClinicsResponse {
  member: Encargado;
  rollback_member: Encargado;
  assignment_change: EncargadoAssignmentChange;
}

export type WorkforceDrawerMode = 'closed' | 'create' | 'detail' | 'edit';

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
