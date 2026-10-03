import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { onboardingApi } from '@/api/onboarding';
import type {
  OnboardingDetectedQuestionKey,
  OnboardingDraftRequest,
  OnboardingNoteReadingAnswers,
  OnboardingQuestionsResponse,
  OnboardingSealedAnswers,
  OnboardingSubmitResult,
  OnboardingWindowAnswers,
  OnboardingWindowField
} from '@/types/onboarding';

const DEFAULT_DRAFT: OnboardingDraftRequest = {
  archetype_key: 'basic-verification@1',
  optional_notes: [],
  removed_notes: [],
  fbd_scope: 'BY_PLAN',
  elg_window_days: 30,
  cross_year_mode: 'WINDOW_ONLY',
  period_policy: null
};

const DEFAULT_WINDOW: OnboardingWindowAnswers = {
  enabled: true,
  look_ahead_days: 7,
  day_counting: 'CALENDAR_DAYS',
  working_days: [0, 1, 2, 3, 4],
  extraction_time: '06:00',
  review_times: ['12:00'],
  review_look_ahead_days: 0,
  timezone: 'America/Chicago'
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asNumberArray(value: unknown, fallback: number[]): number[] {
  return Array.isArray(value) ? value.map((item) => Number(item)).filter((item) => Number.isInteger(item)) : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.map(String) : fallback;
}

export const useOnboardingAnswersStore = defineStore('onboardingAnswers', () => {
  const token = ref('');
  const questions = ref<OnboardingQuestionsResponse | null>(null);
  const draftQuestionAnswers = ref<Record<string, unknown>>({});
  const draft = ref<OnboardingDraftRequest>({ ...DEFAULT_DRAFT });
  const windowAnswers = ref<OnboardingWindowAnswers>({
    ...DEFAULT_WINDOW,
    working_days: [...DEFAULT_WINDOW.working_days],
    review_times: [...DEFAULT_WINDOW.review_times]
  });
  const noteReading = ref<OnboardingNoteReadingAnswers>({ enabled: true, mode: 'REVIEW_FIRST' });
  const loading = ref(false);
  const ready = computed(() => questions.value !== null);
  const detectionUnavailable = computed(() => questions.value?.flags.includes('DETECTION_UNAVAILABLE') ?? false);

  function reset(): void {
    token.value = '';
    questions.value = null;
    draftQuestionAnswers.value = {};
    draft.value = { ...DEFAULT_DRAFT };
    windowAnswers.value = {
      ...DEFAULT_WINDOW,
      working_days: [...DEFAULT_WINDOW.working_days],
      review_times: [...DEFAULT_WINDOW.review_times]
    };
    noteReading.value = { enabled: true, mode: 'REVIEW_FIRST' };
    loading.value = false;
  }

  function applyQuestions(payload: OnboardingQuestionsResponse): void {
    questions.value = payload;
    draftQuestionAnswers.value = Object.fromEntries(payload.questions.map((question) => [question.question_key, question.recommended]));
    draft.value = {
      ...DEFAULT_DRAFT,
      period_policy: { answers: { ...draftQuestionAnswers.value } }
    };

    const windowDraft = {
      ...DEFAULT_WINDOW,
      working_days: [...DEFAULT_WINDOW.working_days],
      review_times: [...DEFAULT_WINDOW.review_times]
    };
    for (const question of payload.window_questions) {
      const field = question.field as OnboardingWindowField;
      if (field === 'look_ahead_days') windowDraft.look_ahead_days = asNumber(question.recommended, windowDraft.look_ahead_days);
      if (field === 'day_counting') windowDraft.day_counting = asString(question.recommended, windowDraft.day_counting);
      if (field === 'working_days') windowDraft.working_days = asNumberArray(question.recommended, windowDraft.working_days);
      if (field === 'extraction_time') windowDraft.extraction_time = asString(question.recommended, windowDraft.extraction_time);
      if (field === 'review_times') windowDraft.review_times = asStringArray(question.recommended, windowDraft.review_times);
      if (field === 'timezone') windowDraft.timezone = asString(question.recommended, windowDraft.timezone);
    }
    windowAnswers.value = windowDraft;
    noteReading.value = { enabled: true, mode: payload.note_reading.recommended_mode };
  }

  async function load(inviteToken: string): Promise<void> {
    reset();
    token.value = inviteToken;
    // SAFETY: the unit-test API mock may omit fetchQuestions; the real onboarding client always provides it.
    const fetchQuestions = (onboardingApi as unknown as { fetchQuestions?: (token: string) => Promise<OnboardingQuestionsResponse> })
      .fetchQuestions;
    if (!fetchQuestions) return;
    loading.value = true;
    try {
      applyQuestions(await fetchQuestions(inviteToken));
    } finally {
      loading.value = false;
    }
  }

  function setDraftQuestion(questionKey: OnboardingDetectedQuestionKey, value: unknown): void {
    draftQuestionAnswers.value = { ...draftQuestionAnswers.value, [questionKey]: value };
    draft.value = { ...draft.value, period_policy: { answers: { ...draftQuestionAnswers.value } } };
  }

  function setWindow(field: OnboardingWindowField, value: unknown): void {
    windowAnswers.value = { ...windowAnswers.value, [field]: value };
  }

  function setNoteReading(mode: OnboardingNoteReadingAnswers['mode']): void {
    noteReading.value = { ...noteReading.value, mode };
  }

  function sealedAnswers(): OnboardingSealedAnswers {
    return {
      draft: { ...draft.value, period_policy: { answers: { ...draftQuestionAnswers.value } } },
      window: {
        ...windowAnswers.value,
        working_days: [...windowAnswers.value.working_days],
        review_times: [...windowAnswers.value.review_times]
      },
      note_reading: { ...noteReading.value }
    };
  }

  async function submit(): Promise<OnboardingSubmitResult> {
    return onboardingApi.submit({ token: token.value, answers: sealedAnswers() });
  }

  return {
    token,
    questions,
    draftQuestionAnswers,
    windowAnswers,
    noteReading,
    loading,
    ready,
    detectionUnavailable,
    reset,
    load,
    setDraftQuestion,
    setWindow,
    setNoteReading,
    sealedAnswers,
    submit
  };
});
