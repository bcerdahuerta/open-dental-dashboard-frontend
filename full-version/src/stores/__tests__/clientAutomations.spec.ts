import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useClientAutomationsStore } from '@/stores/clientAutomations';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn()
  }
}));

const rulePayload = {
  id: 'rule-1',
  client_id: 'client-1',
  clinic_id: 'clinic-1',
  rule_type: 'appointment_provider_reassignment',
  enabled: true,
  timezone: 'America/Managua',
  schedule_time: '20:30',
  max_attempts: 3,
  internal_owner: 'Operations',
  schedule_status: 'ready',
  next_scheduled_execution_at: '2026-07-03T02:30:00+00:00',
  next_target_service_date: '2026-07-06',
  last_run_status: 'COMPLETED',
  last_run_target_service_date: '2026-07-02',
  config: {
    source_provider_abbr: 'BEVE',
    target_provider_abbr: 'APPT',
    target_window: 'next_business_day'
  }
};

const healthPayload = {
  use_cloud_tasks: true,
  queue_name: 'writeback-jobs',
  service_url_configured: true,
  service_account_configured: true,
  enabled_rules_count: 61,
  clinic_scoped_rules_count: 61,
  client_wide_rules_count: 0,
  max_dispatch_per_sweep: 20,
  scheduler_job_configured: false,
  scheduler_job_name: null,
  scheduler_verification: 'external_not_verified'
};

const unsafeRunPayload = {
  id: 'run-1',
  rule_id: 'rule-1',
  client_id: 'client-1',
  clinic_id: 'clinic-1',
  target_service_date: '2026-07-06',
  status: 'COMPLETED',
  matched_count: 2,
  changed_count: 1,
  skipped_count: 1,
  failed_count: 0,
  retry_attempts: 1,
  max_attempts: 3,
  error_code: 'OD_PATIENT_JANE_DOE',
  error_summary: 'Patient Jane Doe PatNum 123 had a raw Open Dental error',
  actions: [{ apt_num: 456, pat_num: 123, patient_name: 'Jane Doe' }],
  apt_num: 456,
  pat_num: 123,
  patient_name: 'Jane Doe',
  note: 'Patient note should never reach UI state'
};

const controlledDiagnosticRunPayload = {
  id: 'run-2',
  rule_id: 'rule-1',
  client_id: 'client-1',
  clinic_id: 'clinic-1',
  target_service_date: '2026-07-07',
  status: 'FAILED_FINAL',
  matched_count: 0,
  changed_count: 0,
  skipped_count: 0,
  failed_count: 0,
  retry_attempts: 0,
  max_attempts: 3,
  error_category: 'provider_resolution',
  error_code: 'PROVIDER_NOT_FOUND',
  error_summary: 'Provider abbreviation could not be resolved.',
  raw_error: 'Patient Jane Doe PatNum 123 raw Open Dental failure',
  actions: [{ apt_num: 456, pat_num: 123, patient_name: 'Jane Doe' }]
};

const phiLikeDiagnosticRunPayload = {
  ...controlledDiagnosticRunPayload,
  id: 'run-3',
  error_category: 'patient_jane_doe',
  error_code: 'PATNUM_123',
  error_summary: 'Provider abbreviation could not be resolved.'
};

describe('clientAutomations store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches summary payloads and strips patient-level or raw error details from runs', async () => {
    const store = useClientAutomationsStore();
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/rules')) return [rulePayload];
      if (url.includes('/runs')) return [unsafeRunPayload];
      return [];
    });

    await store.fetchRules();
    await store.fetchRuns({ ruleId: 'rule-1', limit: 10 });

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/client-automations/rules'));
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/client-automations/runs?rule_id=rule-1&limit=10'));
    expect(store.rules[0]).toEqual(rulePayload);
    expect(store.runs[0]).toEqual({
      id: 'run-1',
      rule_id: 'rule-1',
      client_id: 'client-1',
      clinic_id: 'clinic-1',
      target_service_date: '2026-07-06',
      status: 'COMPLETED',
      matched_count: 2,
      changed_count: 1,
      skipped_count: 1,
      failed_count: 0,
      retry_attempts: 1,
      max_attempts: 3
    });
    expect('actions' in store.runs[0]).toBe(false);
    expect('apt_num' in store.runs[0]).toBe(false);
    expect('pat_num' in store.runs[0]).toBe(false);
    expect('patient_name' in store.runs[0]).toBe(false);
    expect('error_summary' in store.runs[0]).toBe(false);
    expect('error_code' in store.runs[0]).toBe(false);
  });

  it('accepts controlled non-PHI failure diagnostics without copying raw unknown details', async () => {
    const store = useClientAutomationsStore();
    vi.mocked(fetchWrapper.get).mockResolvedValue([controlledDiagnosticRunPayload]);

    await store.fetchRuns({ limit: 10 });

    expect(store.runs[0]).toEqual({
      id: 'run-2',
      rule_id: 'rule-1',
      client_id: 'client-1',
      clinic_id: 'clinic-1',
      target_service_date: '2026-07-07',
      status: 'FAILED_FINAL',
      matched_count: 0,
      changed_count: 0,
      skipped_count: 0,
      failed_count: 0,
      retry_attempts: 0,
      max_attempts: 3,
      error_category: 'provider_resolution',
      error_code: 'PROVIDER_NOT_FOUND',
      error_summary: 'Provider abbreviation could not be resolved.'
    });
    expect('raw_error' in store.runs[0]).toBe(false);
    expect('actions' in store.runs[0]).toBe(false);
    expect(JSON.stringify(store.runs[0])).not.toContain('Jane Doe');
    expect(JSON.stringify(store.runs[0])).not.toContain('PatNum');
    expect(JSON.stringify(store.runs[0])).not.toContain('Open Dental failure');
  });

  it('rejects PHI-like diagnostic tokens even when token characters are otherwise controlled', async () => {
    const store = useClientAutomationsStore();
    vi.mocked(fetchWrapper.get).mockResolvedValue([phiLikeDiagnosticRunPayload]);

    await store.fetchRuns({ limit: 10 });

    expect('error_category' in store.runs[0]).toBe(false);
    expect('error_code' in store.runs[0]).toBe(false);
    expect('error_summary' in store.runs[0]).toBe(false);
    expect(JSON.stringify(store.runs[0])).not.toContain('patient_jane_doe');
    expect(JSON.stringify(store.runs[0])).not.toContain('PATNUM_123');
  });

  it('updates rule enabled state through the internal API and patches local summary state', async () => {
    const store = useClientAutomationsStore();
    store.rules = [{ ...rulePayload, enabled: true }];
    vi.mocked(fetchWrapper.patch).mockResolvedValue({ ...rulePayload, enabled: false });

    const updated = await store.updateRuleEnabled('rule-1', false);

    expect(fetchWrapper.patch).toHaveBeenCalledWith(expect.stringContaining('/client-automations/rules/rule-1'), { enabled: false });
    expect(updated.enabled).toBe(false);
    expect(store.rules[0].enabled).toBe(false);
  });

  it('fetches health summary fields for scheduler readiness display', async () => {
    const store = useClientAutomationsStore();
    vi.mocked(fetchWrapper.get).mockResolvedValue(healthPayload);

    await store.fetchHealth();

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/client-automations/health'));
    expect(store.health).toEqual(healthPayload);
  });

  it('stores manual run dispatch result without exposing patient-level details', async () => {
    const store = useClientAutomationsStore();
    vi.mocked(fetchWrapper.post).mockResolvedValue({
      ...controlledDiagnosticRunPayload,
      dispatch_status: { status: 'queued', dispatched: true },
      actions: [{ apt_num: 456, pat_num: 123, patient_name: 'Jane Doe' }]
    });

    const result = await store.createManualRun('rule-1', { target_service_date: '2026-07-07' });

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/client-automations/rules/rule-1/manual-run'), {
      target_service_date: '2026-07-07'
    });
    expect(result.dispatch_status).toEqual({ status: 'queued', dispatched: true });
    expect(store.runs[0].id).toBe('run-2');
    expect(JSON.stringify(store.runs[0])).not.toContain('Jane Doe');
    expect(JSON.stringify(store.runs[0])).not.toContain('apt_num');
  });

  it('keeps loading active until concurrent summary requests have both settled', async () => {
    const store = useClientAutomationsStore();
    let resolveRules!: (value: unknown[]) => void;
    let resolveRuns!: (value: unknown[]) => void;
    const rulesRequest = new Promise<unknown[]>((resolve) => {
      resolveRules = resolve;
    });
    const runsRequest = new Promise<unknown[]>((resolve) => {
      resolveRuns = resolve;
    });

    vi.mocked(fetchWrapper.get).mockImplementation((url: string) => {
      if (url.includes('/rules')) return rulesRequest;
      if (url.includes('/runs')) return runsRequest;
      return Promise.resolve([]);
    });

    const fetchRulesPromise = store.fetchRules();
    const fetchRunsPromise = store.fetchRuns({ limit: 10 });

    expect(store.loading).toBe(true);

    resolveRules([rulePayload]);
    await fetchRulesPromise;

    expect(store.loading).toBe(true);

    resolveRuns([unsafeRunPayload]);
    await fetchRunsPromise;

    expect(store.loading).toBe(false);
  });

  it('throws a generic safe error when summary API failures include sensitive raw details', async () => {
    const store = useClientAutomationsStore();
    vi.mocked(fetchWrapper.get).mockRejectedValue(new Error('Patient Jane Doe PatNum 123 raw Open Dental failure'));

    await expect(store.fetchRuns()).rejects.toThrow('Unable to load automation summaries.');

    expect(store.error).toBe('Unable to load automation summaries.');
    expect(store.error).not.toContain('Jane Doe');
    expect(store.error).not.toContain('PatNum');
    expect(store.error).not.toContain('Open Dental failure');
  });

  it('throws generic safe errors for write actions when API failures include sensitive raw details', async () => {
    const store = useClientAutomationsStore();
    const sensitiveFailure = new Error('Patient Jane Doe PatNum 123 raw Open Dental failure');

    vi.mocked(fetchWrapper.patch).mockRejectedValueOnce(sensitiveFailure);
    await expect(store.updateRuleEnabled('rule-1', true)).rejects.toThrow('Unable to update automation rule.');
    expect(store.error).toBe('Unable to update automation rule.');

    vi.mocked(fetchWrapper.post).mockRejectedValueOnce(sensitiveFailure);
    await expect(store.createManualRun('rule-1', { target_service_date: '2026-07-06' })).rejects.toThrow(
      'Unable to create manual automation run.'
    );
    expect(store.error).toBe('Unable to create manual automation run.');

    expect(store.error).not.toContain('Jane Doe');
    expect(store.error).not.toContain('PatNum');
    expect(store.error).not.toContain('Open Dental failure');
  });
});
