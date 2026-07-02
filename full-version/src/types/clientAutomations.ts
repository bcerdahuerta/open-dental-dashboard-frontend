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
