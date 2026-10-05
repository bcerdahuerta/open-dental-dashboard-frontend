import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h } from 'vue';
import InviteRescue from '@/views/onboarding/InviteRescue.vue';
import DetectedQuestion from '@/components/onboarding/DetectedQuestion.vue';
import WindowQuestions from '@/components/onboarding/WindowQuestions.vue';
import NoteReadingChoice from '@/components/onboarding/NoteReadingChoice.vue';
import { useOnboardingAnswersStore } from '@/stores/onboardingAnswers';
import { OnboardingPublicHttpError } from '@/types/onboarding';

const api = vi.hoisted(() => ({ redeem: vi.fn(), readSetup: vi.fn(), fetchSetupQuestions: vi.fn(), saveSetup: vi.fn(), submit: vi.fn() }));
vi.mock('@/api/onboarding', () => ({ onboardingApi: api }));
const TOKEN = 'synthetic-fragment-token';
const progress = { setup_id: 'setup-a', client_id: 'client-a', revision: 3, settings: {}, created_at: '2026-01-01', updated_at: '2026-01-01' };
// Exact setup/questions vocabulary/shape from the setup service and its window/note modules.
function fixture() {
  return {
    setup_id: 'setup-a', client_id: 'client-a', client_name: 'Example Dental', flags: [], diagnostics: [],
    save_notice: 'Save proposed extraction settings. This does not submit or activate services.',
    questions: [
      { question_key: 'practices_in_scope', title: 'Which practices does this cover?', help: 'Pick every practice this client covers.', evidence: 'We saw 2 practices for this key.', recommended: null, basis: 'PRACTICES_DETECTED:2', needs_client_confirmation: true,
        options: [{ value: 'clinic-a:1', label: 'North Office' }, { value: 'clinic-a:2', label: 'South Office' }] },
      { question_key: 'last_check_source', title: 'Which check does the practice rely on?', help: 'Pick the record the practice keeps today.', evidence: 'Choose the recorded timestamp you want to propose for the last insurance check.', recommended: null, basis: 'CLIENT_SELECTION_REQUIRED', needs_client_confirmation: true,
        options: [
          { value: 'PLAN_VERIFICATION', label: 'Insurance plan check', summary: 'Last verified date on the insurance plan verification record (DateLastVerified).' },
          { value: 'PATIENT_VERIFICATION', label: 'Patient check', summary: 'Last verified date on the patient verification record (DateLastVerified).' },
          { value: 'FORM_UPLOAD_DATE', label: 'Uploaded form date', summary: 'Created date of an uploaded insurance verification form (document.DateCreated).' }
        ] },
      { question_key: 'eligibility_only_carriers', title: 'Which insurers need only a yes-or-no coverage check?', help: 'Choose proposed eligibility-only insurers. An empty selection means none chosen.', evidence: 'We saw 2 insurers in the records we checked.', recommended: null, basis: 'DETECTED_INSURERS', needs_client_confirmation: true,
        options: [{ value: 'Example Carrier A', label: 'Example Carrier A' }, { value: 'Example Carrier B', label: 'Example Carrier B' }] }
    ],
    window_questions: [
      { field: 'look_ahead_days', title: 'How far ahead should we look for visits?', help: 'Use 0 to read only the day itself.', kind: 'number', minimum: 0, maximum: 30, recommended: 3, needs_client_confirmation: true },
      { field: 'day_counting', title: 'How should we count those days?', help: 'Business days skip the days the practice is closed.', kind: 'choice', recommended: 'BUSINESS_DAYS', needs_client_confirmation: true,
        options: [{ value: 'BUSINESS_DAYS', label: 'Business days only' }, { value: 'CALENDAR_DAYS', label: 'Every day' }] },
      { field: 'working_days', title: 'Which days does the practice work?', help: 'We never read on a day the practice is closed.', kind: 'weekdays', recommended: [0, 1, 2, 3, 4], needs_client_confirmation: true,
        options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((label, value) => ({ value, label })) },
      { field: 'extraction_time', title: 'What time should we read each day?', help: 'Early is better.', kind: 'time', recommended: '06:00', needs_client_confirmation: true },
      { field: 'review_times', title: 'What time should we check the day again?', help: 'The second pass catches changes made during the day.', kind: 'time_list', recommended: ['13:00'], needs_client_confirmation: true },
      { field: 'timezone', title: 'Which timezone is the practice in?', help: 'All the times above are in this timezone.', kind: 'timezone', recommended: null, needs_client_confirmation: true }
    ],
    note_reading: {
      question_key: 'note_reading', title: 'Read insurance details from appointment notes',
      summary: 'Staff MAY supply insurance details not recorded in Open Dental in an appointment note. This preference is for reading those details, not writing notes or converting uninsured patients.',
      format_intro: 'It works when the note lists one detail per line, with these labels:',
      example: 'Carrier: Delta Dental\nMember ID: 987654321\nGroup #: 4412\nGroup Name: Acme Manufacturing\nSubscriber: Maria Lopez\nDOB: 03/14/1985',
      format_outro: 'The lines can come in any order. Only details present in the note can be read.',
      limits: 'Saving this preference does not write appointment notes or insurance records, or activate services.', recommended_mode: 'REVIEW_FIRST',
      modes: [{ value: 'REVIEW_FIRST', label: 'Propose review before use', summary: 'A proposed preference only; saving does not activate it.' }, { value: 'APPLY_AUTOMATICALLY', label: 'Propose automatic use', summary: 'A proposed preference only; saving does not activate it.' }]
    }
  };
}
const Select = defineComponent({
  props: { modelValue: null, items: Array, itemTitle: String, itemValue: String, label: String, multiple: Boolean }, emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    return () => h('label', attrs, [props.label, h('select', {
      multiple: props.multiple, value: props.modelValue,
      onChange: (event: Event) => {
        const target = event.target as HTMLSelectElement;
        emit('update:modelValue', props.multiple ? Array.from(target.selectedOptions, o => o.value) : target.value);
      }
    }, ((props.items ?? []) as Record<string, unknown>[]).map((item) => h('option', { value: item[props.itemValue ?? 'value'] as string }, String(item[props.itemTitle ?? 'title'])))) ]);
  }
});
const stubs = {
  UiParentCard: { props: ['title'], template: '<section><h2>{{ title }}</h2><slot /></section>' },
  VBtn: { props: ['loading', 'disabled'], template: '<button :disabled="disabled || loading"><slot /></button>' },
  VAlert: { template: '<div><slot /></div>' }, VSelect: Select, VAutocomplete: Select,
  VTextField: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<label>{{ label }}<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>' },
  VRadioGroup: { props: ['modelValue'], emits: ['update:modelValue'], template: '<div><slot /></div>' },
  VRadio: { props: ['label', 'value'], template: '<label>{{ label }}<slot name="label" /></label>' }
};
const mounted: VueWrapper[] = [];
async function mountPage() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/o/:id', component: InviteRescue }] });
  await router.push('/o/client-a');
  window.history.replaceState({}, '', `#${TOKEN}`);
  const wrapper = mount(InviteRescue, { global: { plugins: [router], stubs } }); mounted.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}
async function click(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper'], name: string) {
  await wrapper.get(`[data-test="${name}"]`).trigger('click');
  await flushPromises();
}

describe('Guided extraction setup', () => {
  afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); });
  beforeEach(() => {
    setActivePinia(createPinia()); vi.resetAllMocks();
    api.redeem.mockResolvedValue({ client_id: 'client-a', setup_id: 'setup-a' });
    api.readSetup.mockResolvedValue(progress); api.fetchSetupQuestions.mockResolvedValue(fixture());
    api.saveSetup.mockImplementation(async (body) => ({ ...progress, revision: body.expected_revision + 1, settings: body.settings }));
  });

  it('loads persisted settings over recommendations including explicit empty values, with no guessed source/timezone', async () => {
    api.readSetup.mockResolvedValue({ ...progress, settings: { practice_refs: [], window: { review_times: [], look_ahead_days: 0 }, note_reading: { enabled: false }, insurance: { eligibility_only_carriers: [] } } });
    const store = useOnboardingAnswersStore(); await store.load(TOKEN);
    expect(store.settings.practice_refs).toEqual([]);
    expect(store.settings.window).toMatchObject({ review_times: [], look_ahead_days: 0 });
    expect(store.settings.window?.timezone).toBeUndefined();
    expect(store.settings.insurance?.last_check_source).toBeUndefined();
    expect(store.settings.note_reading?.enabled).toBe(false);
  });

  it('saves the full typed settings with current revision, not period_policy or final submit', async () => {
    const store = useOnboardingAnswersStore(); await store.load(TOKEN);
    store.setPractices(['clinic-a:2']); store.setWindow('timezone', 'America/Chicago');
    store.setInsurance('last_check_source', 'PATIENT_VERIFICATION'); store.setCarriers(['Example Carrier B']);
    const settings = JSON.parse(JSON.stringify(store.settings)); await store.save();
    expect(api.saveSetup).toHaveBeenCalledWith({ token: TOKEN, expected_revision: 3, settings });
    expect(settings).not.toHaveProperty('period_policy'); expect(settings).not.toHaveProperty('draft');
    expect(store.progress?.revision).toBe(4); expect(store.saved).toBe(true); expect(api.submit).not.toHaveBeenCalled();
  });

  it('preserves local edits on 409, blocks replay and reloads only on explicit action', async () => {
    const store = useOnboardingAnswersStore(); await store.load(TOKEN); store.setWindow('look_ahead_days', 12);
    api.saveSetup.mockRejectedValue(new OnboardingPublicHttpError(409, 'EXTRACTION_SETUP_REVISION_CONFLICT', 'This setup changed. Reload it before saving again.'));
    await store.save(); await store.save();
    expect(store.settings.window?.look_ahead_days).toBe(12); expect(store.progress?.revision).toBe(3);
    expect(store.conflict).toBe(true); expect(store.saved).toBe(false); expect(api.saveSetup).toHaveBeenCalledTimes(1);
    api.readSetup.mockResolvedValue({ ...progress, revision: 5, settings: { window: { look_ahead_days: 8 } } });
    await store.reload(); expect(store.settings.window?.look_ahead_days).toBe(8); expect(store.conflict).toBe(false);
  });

  it('shows save errors, rejects duplicate saves, and never marks a failed save successful', async () => {
    const store = useOnboardingAnswersStore(); await store.load(TOKEN);
    let reject!: (e: Error) => void;
    api.saveSetup.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    const pending = store.save(); await store.save(); expect(api.saveSetup).toHaveBeenCalledTimes(1);
    reject(new Error('offline')); await pending;
    expect(store.error).toContain('could not save'); expect(store.saved).toBe(false); expect(store.saving).toBe(false);
  });

  it('restores saved progress even when questions fail, and retains missing-source selections', async () => {
    api.readSetup.mockResolvedValue({ ...progress, settings: { practice_refs: ['clinic-a:9'], insurance: { eligibility_only_carriers: ['Former Carrier'] } } });
    api.fetchSetupQuestions.mockRejectedValue(new Error('unavailable'));
    const store = useOnboardingAnswersStore(); await store.load(TOKEN);
    expect(store.progress?.revision).toBe(3); expect(store.settings.practice_refs).toEqual(['clinic-a:9']);
    expect(store.settings.insurance?.eligibility_only_carriers).toEqual(['Former Carrier']); expect(store.questionsError).toBeTruthy();
  });

  it('ignores stale link responses and clears settings/token on reset', async () => {
    const store = useOnboardingAnswersStore();
    let resolve!: (p: typeof progress) => void;
    api.readSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const oldLoad = store.load('old-token'); await store.load('new-token'); resolve({ ...progress, client_id: 'old-client' }); await oldLoad;
    expect(store.progress?.client_id).toBe('client-a');
    store.reset(); expect(store.progress).toBeNull(); expect(store.settings).toEqual({});
    expect(JSON.stringify(store.$state)).not.toContain('new-token');
  });

  it('walks sections, retains edits on Back and Review Edit, and saves only from review', async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain('Set up your practice'); expect(wrapper.text()).toContain('Example Dental');
    await click(wrapper, 'extraction-start'); expect(wrapper.text()).toContain('Step 1 of 4');
    await wrapper.get('[data-test="detected-question-practices_in_scope"] select').setValue(['clinic-a:2']);
    await click(wrapper, 'extraction-continue'); expect(wrapper.text()).toContain('Step 2 of 4');
    await wrapper.get('[data-test="window-field-timezone"] select').setValue('America/Chicago');
    await click(wrapper, 'extraction-back'); expect(useOnboardingAnswersStore().settings.practice_refs).toEqual(['clinic-a:2']);
    await click(wrapper, 'extraction-continue'); await click(wrapper, 'extraction-continue');
    expect(wrapper.text()).toContain('Insurance information');
    wrapper.findAllComponents(DetectedQuestion).find(component => component.props('question').question_key === 'last_check_source')!.vm.$emit('update:modelValue', 'PLAN_VERIFICATION');
    wrapper.getComponent(NoteReadingChoice).vm.$emit('update:enabled', true);
    await flushPromises();
    expect(wrapper.get('[data-test="note-reading-example"]').text()).toBe(fixture().note_reading.example);
    expect(wrapper.get('[data-test="note-reading-example"]').classes()).toContain('text-pre-wrap');
    await click(wrapper, 'extraction-continue'); expect(wrapper.text()).toContain('South Office'); expect(wrapper.text()).toContain('Central Time');
    await click(wrapper, 'review-edit-schedule'); expect(wrapper.text()).toContain('Step 2 of 4');
    await click(wrapper, 'extraction-continue'); expect(wrapper.text()).toContain('Step 4 of 4');
    expect(api.saveSetup).not.toHaveBeenCalled();
    await click(wrapper, 'extraction-save'); expect(wrapper.text()).toContain('Extraction settings saved. Your full setup has not been submitted yet.');
    expect(api.saveSetup.mock.calls[0][0].settings.insurance.eligibility_only_carriers).toEqual([]);
    expect(api.submit).not.toHaveBeenCalled(); wrapper.unmount();
  });

  it('renders a single practice as confirmation rather than a selectable location', async () => {
    const pack = fixture(); pack.questions[0].options = [{ value: 'clinic-a:1', label: 'North Office' }]; pack.questions[0].recommended = ['clinic-a:1'] as never;
    api.fetchSetupQuestions.mockResolvedValue(pack);
    const { wrapper } = await mountPage(); await click(wrapper, 'extraction-start');
    expect(wrapper.text()).toContain('North Office'); expect(wrapper.find('[data-test="detected-question-practices_in_scope"] select').exists()).toBe(false);
    expect(useOnboardingAnswersStore().settings.practice_refs).toEqual(['clinic-a:1']); wrapper.unmount();
  });

  it('multiselect emits JSON lists; No clears carrier exceptions and Yes reveals search', async () => {
    const pack = fixture();
    const wrapper = mount(DetectedQuestion, { props: { question: pack.questions[2] as never, modelValue: [] }, global: { stubs } });
    expect(wrapper.text()).toContain('No'); expect(wrapper.text()).toContain('Yes');
    // Toggle using the component emission, then exercise the rendered searchable multiselect.
    const groups = wrapper.findAllComponents(stubs.VRadioGroup);
    groups[0].vm.$emit('update:modelValue', true); await flushPromises();
    await wrapper.get('select').setValue(['Example Carrier A', 'Example Carrier B']);
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual([['Example Carrier A', 'Example Carrier B']]);
    groups[0].vm.$emit('update:modelValue', false); await flushPromises();
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]).toEqual([[]]); wrapper.unmount();
  });

  it('labels timezone IANA values, uses Monday=0, and hides counting weekdays for calendar days', async () => {
    const wrapper = mount(WindowQuestions, { props: { questions: fixture().window_questions as never, modelValue: { day_counting: 'BUSINESS_DAYS', working_days: [0], review_times: [] } }, global: { stubs } });
    expect(wrapper.text()).toContain('Eastern Time (EST/EDT)'); expect(wrapper.text()).toContain('Arizona');
    const monday = wrapper.get('[data-test="window-field-working_days"] option'); expect(monday.attributes('value')).toBe('0');
    await wrapper.get('[data-test="window-field-timezone"] select').setValue('America/Phoenix');
    expect(wrapper.emitted('update:field')?.slice(-1)[0]).toEqual(['timezone', 'America/Phoenix']);
    expect(wrapper.text()).not.toContain('We never read on a day');
    await wrapper.setProps({ modelValue: { day_counting: 'CALENDAR_DAYS' } });
    expect(wrapper.find('[data-test="window-field-working_days"]').exists()).toBe(false); wrapper.unmount();
  });

  it('renders save errors and conflict resolution without losing local changes', async () => {
    api.readSetup.mockResolvedValue({ ...progress, settings: { practice_refs: ['clinic-a:1'], window: { timezone: 'America/Chicago' }, insurance: { last_check_source: 'PLAN_VERIFICATION' } } });
    const { wrapper } = await mountPage();
    await click(wrapper, 'extraction-start'); await click(wrapper, 'extraction-continue'); await click(wrapper, 'extraction-continue'); await click(wrapper, 'extraction-continue');
    api.saveSetup.mockRejectedValueOnce(new OnboardingPublicHttpError(422, 'EXTRACTION_SETUP_SELECTION_INVALID', 'Choose practices and insurers offered for this setup.'));
    await click(wrapper, 'extraction-save'); expect(wrapper.get('[data-test="rescue-error"]').text()).toContain('Choose practices');
    expect(wrapper.find('[data-test="extraction-saved"]').exists()).toBe(false);
    api.saveSetup.mockRejectedValueOnce(new OnboardingPublicHttpError(409, 'EXTRACTION_SETUP_REVISION_CONFLICT', 'This setup changed. Reload it before saving again.'));
    await click(wrapper, 'extraction-save'); expect(wrapper.get('[data-test="extraction-save"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-test="setup-reload"]').text()).toContain('discard local changes');
    api.readSetup.mockResolvedValue({ ...progress, revision: 9, settings: { practice_refs: ['clinic-a:2'] } });
    await click(wrapper, 'setup-reload'); expect(useOnboardingAnswersStore().progress?.revision).toBe(9);
    expect(useOnboardingAnswersStore().settings.practice_refs).toEqual(['clinic-a:2']);
  });

  it('public setup transport uses exact routes and JSON bodies, never headers/path/query tokens', async () => {
    const actual = await vi.importActual<typeof import('@/api/onboarding')>('@/api/onboarding');
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => new Response(JSON.stringify({ status: 'success', data: String(url).endsWith('/questions') ? fixture() : progress }), { status: 200 }));
    expect(await actual.onboardingApi.readSetup(TOKEN)).toEqual(progress);
    expect(await actual.onboardingApi.fetchSetupQuestions(TOKEN)).toEqual(fixture());
    const body = { token: TOKEN, expected_revision: 3, settings: { practice_refs: ['clinic-a:2'], insurance: { eligibility_only_carriers: ['Example Carrier A'] } } };
    await actual.onboardingApi.saveSetup(body);
    expect(transport.mock.calls.map(call => String(call[0]).split('/workflow-builder')[1])).toEqual([
      '/onboarding-invites/setup/read', '/onboarding-invites/setup/questions', '/onboarding-invites/setup/save'
    ]);
    for (const [url, request] of transport.mock.calls) {
      expect(String(url)).not.toContain(TOKEN); expect(request?.credentials).toBe('omit');
      expect(request?.headers).toEqual({ 'Content-Type': 'application/json' });
    }
    expect(JSON.parse(String(transport.mock.calls[2][1]?.body))).toEqual(body);
    transport.mockRestore();
    const { fetchWrapper } = await import('@/utils/helpers/fetch-wrapper');
    const post = vi.spyOn(fetchWrapper, 'post').mockResolvedValue({ data: {} });
    await actual.onboardingApi.mintSetup('client-a'); await actual.onboardingApi.mintSetup('client-a', 'setup-a');
    expect(post.mock.calls[0][0]).toContain('/workflow-builder/onboarding-invites/setup/mint');
    expect(post.mock.calls[0][1]).toEqual({ client_id: 'client-a' });
    expect(post.mock.calls[1][1]).toEqual({ client_id: 'client-a', renew_setup_id: 'setup-a' });
    post.mockRestore();
  });

  it('never stores or logs token and clears memory on leaving the public view', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem'); const log = vi.spyOn(console, 'log');
    const { wrapper, router } = await mountPage();
    expect(storage).not.toHaveBeenCalled(); expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN);
    expect(router.currentRoute.value.query).toEqual({}); expect(window.location.search).not.toContain(TOKEN);
    wrapper.unmount(); expect(useOnboardingAnswersStore().progress).toBeNull();
    expect(JSON.stringify(useOnboardingAnswersStore().$state)).not.toContain(TOKEN);
    storage.mockRestore(); log.mockRestore();
  });
});
