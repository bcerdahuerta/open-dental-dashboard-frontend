import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import ClientAutomationsPanel from '@/components/admin/ClientAutomationsPanel.vue';
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
  error_summary: 'Raw Open Dental error for Patient John Doe PatNum 123',
  actions: [{ apt_num: 456, patient_name: 'John Doe', pat_num: 123 }]
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
  raw_error: 'Patient John Doe PatNum 123 raw Open Dental timeout',
  actions: [{ apt_num: 456, patient_name: 'John Doe', pat_num: 123 }]
};

const phiLikeDiagnosticRunPayload = {
  ...controlledDiagnosticRunPayload,
  id: 'run-3',
  error_category: 'patient_john_doe',
  error_code: 'PATNUM_123',
  error_summary: 'Provider abbreviation could not be resolved.'
};

function mountPanel() {
  return mount(ClientAutomationsPanel, {
    global: {
      stubs: {
        UiParentCard: { props: ['title'], template: '<section><h2>{{ title }}</h2><slot name="action" /><slot /></section>' }
      }
    }
  });
}

function getRenderedButton(wrapper: ReturnType<typeof mountPanel>, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().includes(label));
  if (!button) throw new Error(`Expected rendered ${label} button`);
  return button;
}

function getRenderedAutomationSwitch(wrapper: ReturnType<typeof mountPanel>) {
  const automationSwitch = wrapper.get('.v-switch');
  expect(automationSwitch.text()).toContain('Enabled');
  return automationSwitch.get('input[type="checkbox"]');
}

describe('ClientAutomationsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders rule and run summaries without patient-level detail or raw error text', async () => {
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/health')) return healthPayload;
      if (url.includes('/rules')) return [rulePayload];
      if (url.includes('/runs')) return [unsafeRunPayload];
      return [];
    });

    const wrapper = mountPanel();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Client Automations');
    expect(text).toContain('Appointment Provider Reassignment');
    expect(text).toContain('BEVE');
    expect(text).toContain('APPT');
    expect(text).toContain('Configured');
    expect(text).toContain('Enabled rules');
    expect(text).toContain('61');
    expect(text).toContain('Dispatch limit');
    expect(text).toContain('20');
    expect(text).toContain('Next target date: 2026-07-06');
    expect(text).toContain('Last run: COMPLETED 2026-07-02');
    expect(text).toContain('Run now');
    expect(text).toContain('2026-07-06');
    expect(text).toContain('Changed 1');
    expect(text).toContain('Skipped 1');
    expect(text).not.toContain('John Doe');
    expect(text).not.toContain('PatNum');
    expect(text).not.toContain('AptNum');
    expect(text).not.toContain('123');
    expect(text).not.toContain('Raw Open Dental error');
  });

  it('renders controlled diagnostics and still suppresses raw patient-level details', async () => {
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/health')) return healthPayload;
      if (url.includes('/rules')) return [rulePayload];
      if (url.includes('/runs')) return [controlledDiagnosticRunPayload];
      return [];
    });

    const wrapper = mountPanel();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Provider resolution');
    expect(text).toContain('PROVIDER_NOT_FOUND');
    expect(text).toContain('Provider abbreviation could not be resolved.');
    expect(text).not.toContain('John Doe');
    expect(text).not.toContain('PatNum');
    expect(text).not.toContain('AptNum');
    expect(text).not.toContain('456');
    expect(text).not.toContain('raw Open Dental timeout');
  });

  it('does not render PHI-like diagnostic tokens from otherwise controlled fields', async () => {
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/health')) return healthPayload;
      if (url.includes('/rules')) return [rulePayload];
      if (url.includes('/runs')) return [phiLikeDiagnosticRunPayload];
      return [];
    });

    const wrapper = mountPanel();
    await flushPromises();

    const text = wrapper.text();
    expect(text).not.toContain('patient_john_doe');
    expect(text).not.toContain('PATNUM_123');
    expect(text).not.toContain('Provider abbreviation could not be resolved.');
  });

  it('shows an empty summary state when no automations or runs exist', async () => {
    vi.mocked(fetchWrapper.get).mockResolvedValue([]);

    const wrapper = mountPanel();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('No automations configured');
    expect(text).toContain('No recent automation runs');
  });

  it('shows a generic safe error alert when summaries fail to load', async () => {
    vi.mocked(fetchWrapper.get).mockRejectedValue(new Error('Patient John Doe PatNum 123 raw Open Dental timeout'));

    const wrapper = mountPanel();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Unable to load automation summaries.');
    expect(text).not.toContain('John Doe');
    expect(text).not.toContain('PatNum');
    expect(text).not.toContain('Open Dental timeout');
  });

  it('refreshes health after a successful enable or pause toggle', async () => {
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/health')) return healthPayload;
      if (url.includes('/rules')) return [rulePayload];
      if (url.includes('/runs')) return [];
      return [];
    });
    vi.mocked(fetchWrapper.patch).mockResolvedValue({ ...rulePayload, enabled: false });
    const wrapper = mountPanel();
    await flushPromises();
    vi.clearAllMocks();
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/health')) return { ...healthPayload, enabled_rules_count: 60 };
      if (url.includes('/rules')) return [{ ...rulePayload, enabled: false }];
      if (url.includes('/runs')) return [];
      return [];
    });

    await getRenderedAutomationSwitch(wrapper).setValue(false);
    await flushPromises();

    expect(fetchWrapper.patch).toHaveBeenCalledWith(expect.stringContaining('/client-automations/rules/rule-1'), { enabled: false });
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/client-automations/health'));
  });

  it('refreshes health after manual run creation and reports already queued status clearly', async () => {
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/health')) return healthPayload;
      if (url.includes('/rules')) return [rulePayload];
      if (url.includes('/runs')) return [];
      return [];
    });
    vi.mocked(fetchWrapper.post).mockResolvedValue({
      ...controlledDiagnosticRunPayload,
      dispatch_status: { status: 'already_queued', dispatched: false }
    });
    const wrapper = mountPanel();
    await flushPromises();
    vi.clearAllMocks();
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/health')) return { ...healthPayload, enabled_rules_count: 61 };
      if (url.includes('/rules')) return [rulePayload];
      if (url.includes('/runs')) return [controlledDiagnosticRunPayload];
      return [];
    });

    await getRenderedButton(wrapper, 'Run now').trigger('click');
    await flushPromises();

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/client-automations/rules/rule-1/manual-run'), {
      target_service_date: '2026-07-06'
    });
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/client-automations/health'));
    expect(wrapper.text()).toContain('Manual run is already queued for Cloud Tasks execution.');
  });
});
