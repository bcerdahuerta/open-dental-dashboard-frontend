import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import type {
  ClientAutomationManualRunRequest,
  ClientAutomationRuleConfig,
  ClientAutomationRuleSummary,
  ClientAutomationRunQuery,
  ClientAutomationRunSummary
} from '@/types/clientAutomations';

const baseUrl = `${import.meta.env.VITE_API_URL}/client-automations`;
const SUMMARY_LOAD_ERROR = 'Unable to load automation summaries.';
const RULE_UPDATE_ERROR = 'Unable to update automation rule.';
const MANUAL_RUN_ERROR = 'Unable to create manual automation run.';
const DIAGNOSTIC_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const SENSITIVE_DIAGNOSTIC_PATTERN = /(patient|patnum|aptnum|open[\s_.:-]*dental|raw|note|dob|ssn)/i;

function safeAutomationError(message: string): Error {
  return new Error(message);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readDiagnosticToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64 || !DIAGNOSTIC_TOKEN_PATTERN.test(trimmed) || SENSITIVE_DIAGNOSTIC_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function readDiagnosticSummary(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 180 || SENSITIVE_DIAGNOSTIC_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function normalizeConfig(value: unknown): ClientAutomationRuleConfig {
  const config = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    source_provider_abbr: readNullableString(config.source_provider_abbr),
    target_provider_abbr: readNullableString(config.target_provider_abbr),
    target_window: readNullableString(config.target_window)
  };
}

function normalizeRule(value: unknown): ClientAutomationRuleSummary {
  const rule = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    id: readString(rule.id),
    client_id: readString(rule.client_id),
    clinic_id: readNullableString(rule.clinic_id),
    rule_type: readString(rule.rule_type),
    enabled: Boolean(rule.enabled),
    timezone: readString(rule.timezone, 'America/Managua'),
    schedule_time: readString(rule.schedule_time, '20:30'),
    max_attempts: readNumber(rule.max_attempts),
    internal_owner: readNullableString(rule.internal_owner),
    config: normalizeConfig(rule.config)
  };
}

function normalizeRun(value: unknown): ClientAutomationRunSummary {
  const run = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const normalized: ClientAutomationRunSummary = {
    id: readString(run.id),
    rule_id: readString(run.rule_id),
    client_id: readString(run.client_id),
    clinic_id: readString(run.clinic_id),
    target_service_date: readString(run.target_service_date),
    status: readString(run.status),
    matched_count: readNumber(run.matched_count),
    changed_count: readNumber(run.changed_count),
    skipped_count: readNumber(run.skipped_count),
    failed_count: readNumber(run.failed_count),
    retry_attempts: readNumber(run.retry_attempts),
    max_attempts: readNumber(run.max_attempts)
  };
  const errorCategory = readDiagnosticToken(run.error_category);
  const errorCode = readDiagnosticToken(run.error_code);
  const errorSummary = readDiagnosticSummary(run.error_summary);
  if (errorCategory && errorCode) {
    normalized.error_category = errorCategory;
    normalized.error_code = errorCode;
    if (errorSummary) normalized.error_summary = errorSummary;
  }
  return normalized;
}

export const useClientAutomationsStore = defineStore('clientAutomations', () => {
  const rules = ref<ClientAutomationRuleSummary[]>([]);
  const runs = ref<ClientAutomationRunSummary[]>([]);
  const pendingRequests = ref(0);
  const loading = computed(() => pendingRequests.value > 0);
  const error = ref<string | null>(null);

  function beginRequest() {
    pendingRequests.value += 1;
  }

  function finishRequest() {
    pendingRequests.value = Math.max(0, pendingRequests.value - 1);
  }

  async function fetchRules() {
    beginRequest();
    error.value = null;
    try {
      const payload = (await fetchWrapper.get(`${baseUrl}/rules`)) as unknown[];
      rules.value = Array.isArray(payload) ? payload.map(normalizeRule) : [];
      return rules.value;
    } catch {
      error.value = SUMMARY_LOAD_ERROR;
      throw safeAutomationError(SUMMARY_LOAD_ERROR);
    } finally {
      finishRequest();
    }
  }

  async function fetchRuns(query?: ClientAutomationRunQuery) {
    beginRequest();
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (query?.ruleId) params.set('rule_id', query.ruleId);
      if (typeof query?.limit === 'number') params.set('limit', String(query.limit));
      const url = params.toString() ? `${baseUrl}/runs?${params.toString()}` : `${baseUrl}/runs`;
      const payload = (await fetchWrapper.get(url)) as unknown[];
      runs.value = Array.isArray(payload) ? payload.map(normalizeRun) : [];
      return runs.value;
    } catch {
      error.value = SUMMARY_LOAD_ERROR;
      throw safeAutomationError(SUMMARY_LOAD_ERROR);
    } finally {
      finishRequest();
    }
  }

  async function updateRuleEnabled(ruleId: string, enabled: boolean) {
    beginRequest();
    error.value = null;
    try {
      const updated = normalizeRule(await fetchWrapper.patch(`${baseUrl}/rules/${ruleId}`, { enabled }));
      const index = rules.value.findIndex((rule) => rule.id === ruleId);
      if (index !== -1) rules.value[index] = updated;
      return updated;
    } catch {
      error.value = RULE_UPDATE_ERROR;
      throw safeAutomationError(RULE_UPDATE_ERROR);
    } finally {
      finishRequest();
    }
  }

  async function createManualRun(ruleId: string, data: ClientAutomationManualRunRequest) {
    beginRequest();
    error.value = null;
    try {
      const run = normalizeRun(await fetchWrapper.post(`${baseUrl}/rules/${ruleId}/manual-run`, data));
      runs.value = [run, ...runs.value.filter((item) => item.id !== run.id)];
      return run;
    } catch {
      error.value = MANUAL_RUN_ERROR;
      throw safeAutomationError(MANUAL_RUN_ERROR);
    } finally {
      finishRequest();
    }
  }

  return {
    rules,
    runs,
    loading,
    error,
    fetchRules,
    fetchRuns,
    updateRuleEnabled,
    createManualRun
  };
});
