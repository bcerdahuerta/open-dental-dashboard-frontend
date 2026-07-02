export interface ClientAutomationRuleConfig {
  source_provider_abbr: string | null;
  target_provider_abbr: string | null;
  target_window: string | null;
}

export interface ClientAutomationRuleSummary {
  id: string;
  client_id: string;
  clinic_id: string | null;
  rule_type: string;
  enabled: boolean;
  timezone: string;
  schedule_time: string;
  max_attempts: number;
  internal_owner: string | null;
  schedule_status: string;
  next_scheduled_execution_at: string | null;
  next_target_service_date: string | null;
  last_run_status: string | null;
  last_run_target_service_date: string | null;
  config: ClientAutomationRuleConfig;
}

export interface ClientAutomationRunSummary {
  id: string;
  rule_id: string;
  client_id: string;
  clinic_id: string;
  target_service_date: string;
  status: string;
  matched_count: number;
  changed_count: number;
  skipped_count: number;
  failed_count: number;
  retry_attempts: number;
  max_attempts: number;
  error_category?: string;
  error_code?: string;
  error_summary?: string;
}

export interface ClientAutomationRunQuery {
  ruleId?: string;
  limit?: number;
}

export interface ClientAutomationManualRunRequest {
  target_service_date: string;
}

export interface ClientAutomationDispatchStatus {
  status: string;
  dispatched: boolean;
  schedule_status?: string;
}

export interface ClientAutomationManualRunResult extends ClientAutomationRunSummary {
  dispatch_status: ClientAutomationDispatchStatus;
}

export interface ClientAutomationHealthSummary {
  use_cloud_tasks: boolean;
  queue_name: string;
  service_url_configured: boolean;
  service_account_configured: boolean;
  enabled_rules_count: number;
  clinic_scoped_rules_count: number;
  client_wide_rules_count: number;
  max_dispatch_per_sweep: number;
  scheduler_job_configured: boolean;
  scheduler_job_name: string | null;
  scheduler_verification: string;
}
