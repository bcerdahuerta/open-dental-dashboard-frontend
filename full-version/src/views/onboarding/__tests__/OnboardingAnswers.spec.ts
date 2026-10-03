import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h, type PropType } from 'vue';

import InviteRescue from '@/views/onboarding/InviteRescue.vue';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type { OnboardingQuestionsResponse, OnboardingRedemption } from '@/types/onboarding';

const api = vi.hoisted(() => ({
  mintDraft: vi.fn(),
  mintInvite: vi.fn(),
  redeem: vi.fn(),
  fetchQuestions: vi.fn(),
  submit: vi.fn(),
  getSopVersion: vi.fn()
}));

vi.mock('@/api/onboarding', () => ({ onboardingApi: api }));

const TOKEN = 'fragment-token-only';

const redemption: OnboardingRedemption = {
  client_id: 'client-a',
  purpose: 'onboarding-draft-v1',
  expires_at: '2026-09-24T00:00:00Z',
  ttl_seconds: 604800,
  diagnostics: []
};

function questions(flags: string[] = []): OnboardingQuestionsResponse {
  return {
    client_id: 'client-a',
    flags,
    questions: [
      {
        question_key: 'last_check_source',
        title: 'Which checks count',
        help: 'Pick the source your team already trusts.',
        evidence: 'We saw 412 plan verifications in your recent history.',
        recommended: 'BY_PLAN',
        options: [
          { value: 'BY_PLAN', label: 'Sentinel plan checks' },
          { value: 'BY_PATIENT', label: 'Sentinel patient checks' }
        ],
        basis: 'PLAN_VERIFICATIONS_412',
        needs_client_confirmation: true
      },
      {
        question_key: 'plan_period',
        recommended: null,
        options: ['calendar'],
        basis: 'NOT_DETECTED',
        needs_client_confirmation: true
      },
      {
        question_key: 'eligibility_only_carriers',
        recommended: [],
        options: [{ value: 'none', label: 'Sentinel no carrier exceptions' }],
        basis: 'CARRIER_SCAN_0',
        needs_client_confirmation: true
      },
      {
        question_key: 'practices_in_scope',
        recommended: ['north'],
        options: [{ value: ['north'], label: 'Sentinel North Office' }],
        basis: 'PRACTICES_1',
        needs_client_confirmation: true
      },
      {
        question_key: 'extraction_window',
        title: 'How far ahead should we look for visits?',
        help: 'We use this to suggest how far ahead to look.',
        evidence: 'We saw 12 appointments in the last 90 days.',
        recommended: null,
        options: [],
        basis: 'APPOINTMENTS_OBSERVED:12',
        needs_client_confirmation: true
      }
    ],
    window_questions: [
      {
        field: 'look_ahead_days',
        title: 'Sentinel horizon',
        help: 'Sentinel between one and thirty',
        kind: 'number',
        recommended: 7,
        minimum: 1,
        maximum: 30
      },
      {
        field: 'day_counting',
        title: 'Sentinel day counting',
        help: 'Sentinel counting help',
        kind: 'choice',
        recommended: 'BUSINESS_DAYS',
        options: [
          { value: 'BUSINESS_DAYS', label: 'Sentinel business days' },
          { value: 'CALENDAR_DAYS', label: 'Sentinel calendar days' }
        ]
      },
      {
        field: 'working_days',
        title: 'Sentinel working days title',
        help: 'Sentinel weekdays help',
        kind: 'weekdays',
        recommended: [0, 1, 2, 3, 4],
        options: [
          { value: 0, label: 'Monday' },
          { value: 1, label: 'Tuesday' },
          { value: 2, label: 'Wednesday' },
          { value: 3, label: 'Thursday' },
          { value: 4, label: 'Friday' },
          { value: 5, label: 'Saturday' },
          { value: 6, label: 'Sunday' }
        ]
      },
      { field: 'extraction_time', title: 'Sentinel extraction time', help: 'Sentinel extraction help', kind: 'time', recommended: '06:30' },
      {
        field: 'review_times',
        title: 'Sentinel review times',
        help: 'Sentinel review help',
        kind: 'time_list',
        recommended: ['12:00', '16:00']
      },
      { field: 'timezone', title: 'Sentinel timezone', help: 'Sentinel timezone help', kind: 'timezone', recommended: 'America/Chicago' }
    ],
    note_reading: {
      question_key: 'note_reading',
      title: 'Sentinel appointment notes',
      summary: 'Sentinel summary for notes',
      format_intro: 'Sentinel intro',
      example: ['Line one', 'Line two', 'Line three', 'Line four', 'Line five', 'Line six'].join('\n'),
      format_outro: 'Sentinel outro',
      limits: 'Sentinel limits',
      recommended_mode: 'REVIEW_FIRST',
      modes: [
        { value: 'REVIEW_FIRST', label: 'Sentinel review first', summary: 'Sentinel review first summary' },
        { value: 'APPLY_AUTOMATICALLY', label: 'Sentinel apply automatically', summary: 'Sentinel apply summary' }
      ]
    },
    activation: { classification_policy_ready: true, window_policy_ready: true }
  };
}

const submission = {
  client_id: 'client-a',
  version: { version_id: 'version-a', version_number: 1, state: 'DRAFT' as const },
  receipt: {
    version_id: 'version-a',
    state: 'DRAFT' as const,
    digest: 'sha256:submitted',
    canonical_bytes: '{}',
    etag: null,
    http_status: 201
  },
  diagnostics: [],
  answers_version: 'onboarding-answers-v2',
  activation: { classification_policy_ready: true, window_policy_ready: true },
  answers: {}
};

function stubs() {
  return {
    VAlert: { template: '<div v-bind="$attrs"><slot /></div>' },
    VCard: { template: '<div><slot /></div>' },
    VCardText: { template: '<div><slot /></div>' },
    VBtn: { props: ['loading'], template: '<button v-bind="$attrs"><slot /></button>' },
    VTextField: {
      props: ['modelValue', 'label', 'hint', 'min', 'max'],
      emits: ['update:modelValue'],
      template:
        '<label v-bind="$attrs">{{ label }} {{ hint }}<input :min="min" :max="max" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>'
    },
    VSelect: defineComponent({
      props: {
        modelValue: { type: [String, Number, Array] as PropType<string | number | unknown[]>, default: '' },
        items: { type: Array as PropType<Array<{ title: string; value: unknown }>>, default: () => [] },
        label: { type: String, default: '' },
        hint: { type: String, default: '' }
      },
      emits: ['update:modelValue'],
      setup(props, { attrs, emit }) {
        return () =>
          h('label', { ...attrs }, [
            props.label,
            ' ',
            props.hint,
            h(
              'select',
              {
                value: Array.isArray(props.modelValue) ? String(props.modelValue[0] ?? '') : String(props.modelValue),
                onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value)
              },
              props.items.map((item) => h('option', { value: String(item.value) }, item.title))
            )
          ]);
      }
    }),
    VRadioGroup: { props: ['modelValue'], emits: ['update:modelValue'], template: '<div v-bind="$attrs"><slot /></div>' },
    VRadio: { props: ['value'], template: '<label v-bind="$attrs"><input type="radio" :value="value" /><slot name="label" /></label>' }
  };
}

async function mountRescue(payload = questions()) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/o/:id', component: InviteRescue }] });
  await router.push('/o/client-a');
  await router.isReady();
  window.location.hash = `#${TOKEN}`;
  api.redeem.mockResolvedValue(redemption);
  api.fetchQuestions.mockResolvedValue(payload);
  api.submit.mockResolvedValue(submission);
  const wrapper = mount(RouterView, { global: { plugins: [router], stubs: stubs() } });
  await flushPromises();
  return { wrapper, router };
}

describe('Onboarding answers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = '';
  });

  it('T01 renders client strings from the payload', async () => {
    const { wrapper } = await mountRescue();
    expect(wrapper.text()).toContain('Sentinel plan checks');
    expect(wrapper.text()).toContain('Sentinel horizon');
    expect(wrapper.text()).toContain('Sentinel appointment notes');
    expect(wrapper.text()).toContain('Which checks count');
    expect(wrapper.text()).toContain('Pick the source your team already trusts.');
  });

  it('T02 lets a suggestion be edited while keeping the rest', async () => {
    const { wrapper } = await mountRescue();
    await wrapper.get('[data-test="detected-question-last_check_source"] select').setValue(JSON.stringify('BY_PATIENT'));
    await wrapper.get('[data-test="rescue-submit"]').trigger('click');
    await flushPromises();
    const body = api.submit.mock.calls[0][0];
    expect(body.answers.draft.period_policy.answers.last_check_source).toBe('BY_PATIENT');
    expect(body.answers.window.look_ahead_days).toBe(7);
  });

  it('T03 renders recommended null without evidence', async () => {
    const { wrapper } = await mountRescue();
    expect(wrapper.get('[data-test="detected-question-plan_period"]').text()).toContain('calendar');
    expect(wrapper.find('[data-test="detected-evidence-plan_period"]').exists()).toBe(false);
  });

  it('T04 renders the server evidence verbatim without the raw basis code', async () => {
    const { wrapper } = await mountRescue();
    const evidence = wrapper.get('[data-test="detected-evidence-last_check_source"]').text();
    expect(evidence).toBe('We saw 412 plan verifications in your recent history.');
    expect(evidence).not.toContain('PLAN_VERIFICATIONS_412');
  });

  it('T05 renders six window fields with min and max', async () => {
    const { wrapper } = await mountRescue();
    expect(wrapper.findAll('[data-test^="window-field-"]')).toHaveLength(6);
    const input = wrapper.get('[data-test="window-field-look_ahead_days"] input');
    expect(input.attributes('min')).toBe('1');
    expect(input.attributes('max')).toBe('30');
  });

  it('T06 shows seven English weekdays from the API options with the Monday-first recommendation preselected', async () => {
    const { wrapper } = await mountRescue();
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) expect(wrapper.text()).toContain(day);
    await wrapper.get('[data-test="rescue-submit"]').trigger('click');
    await flushPromises();
    expect(api.submit.mock.calls[0][0].answers.window.working_days).toEqual([0, 1, 2, 3, 4]);
  });

  it('T07 renders note reading copy, example and both modes with review first selected', async () => {
    const { wrapper } = await mountRescue();
    expect(wrapper.get('[data-test="note-reading-example"]').text().split('\n')).toHaveLength(6);
    expect(wrapper.text()).toContain('Sentinel review first');
    expect(wrapper.text()).toContain('Sentinel apply automatically');
    await wrapper.get('[data-test="rescue-submit"]').trigger('click');
    await flushPromises();
    expect(api.submit.mock.calls[0][0].answers.note_reading.mode).toBe('REVIEW_FIRST');
    expect(api.submit.mock.calls[0][0].answers.note_reading.enabled).toBe(true);
  });

  it('T08 submits one sealed three-leg request', async () => {
    const { wrapper } = await mountRescue();
    await wrapper.get('[data-test="rescue-submit"]').trigger('click');
    await flushPromises();
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(api.submit.mock.calls[0][0]).toMatchObject({ token: TOKEN, answers: { draft: {}, window: {}, note_reading: {} } });
  });

  it('T09 shows a closed rejection and preserves answers', async () => {
    const { wrapper } = await mountRescue();
    api.submit.mockRejectedValueOnce(new OnboardingPublicHttpError(422, 'ANSWERS_WINDOW_REJECTED', 'Please review the schedule answers.'));
    await wrapper.get('[data-test="window-field-look_ahead_days"] input').setValue('12');
    await wrapper.get('[data-test="rescue-submit"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-test="rescue-error"]').text()).toContain('Please review');
    expect((wrapper.get('[data-test="window-field-look_ahead_days"] input').element as HTMLInputElement).value).toBe('12');
  });

  it('T10 keeps the token out of query strings, paths and headers', async () => {
    const { wrapper, router } = await mountRescue();
    await wrapper.get('[data-test="rescue-submit"]').trigger('click');
    await flushPromises();
    expect(api.fetchQuestions).toHaveBeenCalledWith(TOKEN);
    expect(router.currentRoute.value.fullPath).not.toContain(TOKEN);
    expect(window.location.search).not.toContain(TOKEN);
    expect(JSON.stringify(api.submit.mock.calls[0][0])).not.toContain('headers');
  });

  it('T11 keeps banned vocabulary out of client-visible copy', async () => {
    const { wrapper } = await mountRescue();
    const text = wrapper.text().toLowerCase();
    for (const banned of ['bookmark', 'digest', 'etag', 'atom_key', 'enrichment', 'parser', 'payload', 'endpoint', 'sql']) {
      expect(text).not.toContain(banned);
    }
  });

  it('T12 detection unavailable shows the plain notice and answerable questions', async () => {
    const { wrapper } = await mountRescue(questions(['DETECTION_UNAVAILABLE']));
    expect(wrapper.get('[data-test="detection-unavailable"]').text()).toContain('We could not read your practice yet');
    expect(wrapper.findAll('[data-test^="detected-question-"]')).toHaveLength(4);
    expect(wrapper.find('[data-test="rescue-submit"]').exists()).toBe(true);
  });

  it('T13 shows the server title and help, and humanises a missing title', async () => {
    const { wrapper } = await mountRescue();
    expect(wrapper.get('[data-test="detected-question-last_check_source"]').text()).toContain('Which checks count');
    expect(wrapper.get('[data-test="detected-help-last_check_source"]').text()).toContain('Pick the source your team already trusts.');
    expect(wrapper.get('[data-test="detected-question-plan_period"]').text()).toContain('Plan period');
  });

  it('T14 omits a zero-option question entirely, including its evidence', async () => {
    const { wrapper } = await mountRescue();
    expect(wrapper.find('[data-test="detected-question-extraction_window"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="detected-evidence-extraction_window"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('We saw 12 appointments');
    expect(wrapper.find('[data-test="detected-question-last_check_source"]').exists()).toBe(true);
  });

  it('T15 groups the questionnaire in contact-voice sections', async () => {
    const { wrapper } = await mountRescue();
    const text = wrapper.text();
    expect(text).toContain('Set up how your verifications work');
    expect(text).toContain('Answer a few questions about your practice. Your administrator reviews them before anything starts.');
    expect(text).toContain('This link is only for you and stays usable for about 7 more days.');
    for (const heading of ['Your checks', 'Your schedule', 'Your notes']) expect(text).toContain(heading);
    const order = ['Your checks', 'Your schedule', 'Your notes'].map((heading) => text.indexOf(heading));
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it('T16 gates submit on the required window answers and hints the empty field', async () => {
    const payload = questions();
    payload.window_questions = payload.window_questions.map((question) =>
      question.field === 'review_times' ? { ...question, recommended: [] } : question
    );
    const { wrapper } = await mountRescue(payload);
    expect(wrapper.get('[data-test="rescue-submit"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-test="window-field-review_times"]').text()).toContain('Answer this to continue');
    expect(wrapper.get('[data-test="window-field-working_days"]').text()).not.toContain('Answer this to continue');

    await wrapper.get('[data-test="window-field-review_times"] input').setValue('12:00');
    await flushPromises();
    expect(wrapper.get('[data-test="window-field-review_times"]').text()).not.toContain('Answer this to continue');
    expect(wrapper.get('[data-test="rescue-submit"]').attributes('disabled')).toBeUndefined();

    await wrapper.get('[data-test="window-field-review_times"] input').setValue('');
    await flushPromises();
    expect(wrapper.get('[data-test="window-field-review_times"]').text()).toContain('Answer this to continue');
    expect(wrapper.get('[data-test="rescue-submit"]').attributes('disabled')).toBeDefined();
  });

  it('T17 requires working days only while the practice counts business days', async () => {
    const payload = questions();
    payload.window_questions = payload.window_questions.map((question) =>
      question.field === 'working_days' ? { ...question, recommended: [] } : question
    );
    const { wrapper } = await mountRescue(payload);
    expect(wrapper.get('[data-test="rescue-submit"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-test="window-field-working_days"]').text()).toContain('Answer this to continue');

    await wrapper.get('[data-test="window-field-day_counting"] select').setValue('CALENDAR_DAYS');
    await flushPromises();
    expect(wrapper.get('[data-test="window-field-working_days"]').text()).not.toContain('Answer this to continue');
    expect(wrapper.get('[data-test="rescue-submit"]').attributes('disabled')).toBeUndefined();
  });
});
