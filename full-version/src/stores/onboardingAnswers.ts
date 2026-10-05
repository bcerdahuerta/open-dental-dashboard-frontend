import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { onboardingApi } from '@/api/onboarding';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type {
  ExtractionInsuranceSettings,
  ExtractionNoteSettings,
  ExtractionSettings,
  ExtractionSetupProgress,
  ExtractionSetupQuestions,
  ExtractionWindowSettings
} from '@/types/onboarding';

function copy<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    throw new Error('Extraction settings could not be copied.');
  }
}
function validProgress(value: ExtractionSetupProgress): boolean {
  return (
    !!value?.setup_id &&
    !!value.client_id &&
    Number.isInteger(value.revision) &&
    value.revision > 0 &&
    !!value.settings &&
    typeof value.settings === 'object' &&
    !Array.isArray(value.settings)
  );
}

export const useOnboardingAnswersStore = defineStore('onboardingAnswers', () => {
  // Capability stays outside reactive/serializable Pinia state. Never persist or log it.
  let token = '';
  let epoch = 0;
  const progress = ref<ExtractionSetupProgress | null>(null);
  const questions = ref<ExtractionSetupQuestions | null>(null);
  const settings = ref<ExtractionSettings>({});
  const loading = ref(false);
  const saving = ref(false);
  const saved = ref(false);
  const conflict = ref(false);
  const error = ref<string | null>(null);
  const questionsError = ref<string | null>(null);
  const ready = computed(() => progress.value !== null);
  const detectionUnavailable = computed(() => questions.value?.flags.includes('DETECTION_UNAVAILABLE') ?? false);

  function reset(): void {
    epoch += 1;
    token = '';
    progress.value = null;
    questions.value = null;
    settings.value = {};
    loading.value = false;
    saving.value = false;
    saved.value = false;
    conflict.value = false;
    error.value = null;
    questionsError.value = null;
  }

  function recommendations(pack: ExtractionSetupQuestions): ExtractionSettings {
    const proposed: ExtractionSettings = {};
    const practice = pack.questions.find((q) => q.question_key === 'practices_in_scope');
    if (Array.isArray(practice?.recommended))
      proposed.practice_refs = practice.recommended.filter((v): v is string => typeof v === 'string');
    const window: ExtractionWindowSettings = {};
    for (const question of pack.window_questions) {
      if (question.recommended !== null && question.recommended !== undefined) {
        Object.assign(window, { [question.field]: copy(question.recommended) });
      }
    }
    if (Object.keys(window).length) proposed.window = window;
    if (pack.note_reading.recommended_mode) proposed.note_reading = { mode: pack.note_reading.recommended_mode };
    const source = pack.questions.find((q) => q.question_key === 'last_check_source')?.recommended;
    if (source === 'PLAN_VERIFICATION' || source === 'PATIENT_VERIFICATION' || source === 'FORM_UPLOAD_DATE') {
      proposed.insurance = { last_check_source: source };
    }
    return proposed;
  }

  async function fetchQuestions(): Promise<void> {
    const current = epoch;
    questionsError.value = null;
    try {
      const pack = await onboardingApi.fetchSetupQuestions(token);
      if (current !== epoch) return;
      if (!progress.value || pack.setup_id !== progress.value.setup_id || pack.client_id !== progress.value.client_id)
        throw new Error('scope');
      questions.value = pack;
    } catch {
      if (current === epoch)
        questionsError.value =
          'Practice and insurer choices are unavailable right now. Your saved settings are still available. Try loading the questions again.';
    }
  }

  async function load(inviteToken: string): Promise<void> {
    reset();
    token = inviteToken;
    const current = epoch;
    loading.value = true;
    try {
      const response = await onboardingApi.readSetup(inviteToken);
      if (current !== epoch) return;
      if (!validProgress(response)) throw new Error('invalid progress');
      progress.value = copy(response);
      settings.value = copy(response.settings);
      await fetchQuestions();
      if (current !== epoch) return;
      if (questions.value) {
        const suggested = recommendations(questions.value);
        const persisted = response.settings;
        settings.value = {
          ...suggested,
          ...copy(persisted),
          ...(suggested.window || persisted.window ? { window: { ...suggested.window, ...persisted.window } } : {}),
          ...(suggested.insurance || persisted.insurance ? { insurance: { ...suggested.insurance, ...persisted.insurance } } : {}),
          ...(suggested.note_reading || persisted.note_reading
            ? { note_reading: { ...suggested.note_reading, ...persisted.note_reading } }
            : {})
        };
      }
    } catch (value) {
      if (current === epoch) {
        error.value =
          value instanceof OnboardingPublicHttpError
            ? value.message
            : 'We could not load your extraction settings. Please reopen the link or try again.';
      }
    } finally {
      if (current === epoch) loading.value = false;
    }
  }

  async function reload(): Promise<void> {
    const capability = token;
    await load(capability);
  }
  function changed(): void {
    saved.value = false;
  }
  function setPractices(refs: string[]): void {
    settings.value = { ...settings.value, practice_refs: [...refs] };
    changed();
  }
  function setWindow<K extends keyof ExtractionWindowSettings>(field: K, value: ExtractionWindowSettings[K]): void {
    settings.value = { ...settings.value, window: { ...settings.value.window, [field]: value } };
    changed();
  }
  function setInsurance<K extends keyof ExtractionInsuranceSettings>(field: K, value: ExtractionInsuranceSettings[K]): void {
    settings.value = { ...settings.value, insurance: { ...settings.value.insurance, [field]: value } };
    changed();
  }
  function setCarriers(carriers: string[]): void {
    setInsurance('eligibility_only_carriers', [...carriers]);
  }
  function setNoteReading<K extends keyof ExtractionNoteSettings>(field: K, value: ExtractionNoteSettings[K]): void {
    settings.value = { ...settings.value, note_reading: { ...settings.value.note_reading, [field]: value } };
    changed();
  }

  async function save(): Promise<void> {
    if (!progress.value || saving.value || loading.value || conflict.value) return;
    const current = epoch;
    const identity = progress.value;
    const assembled = copy(settings.value);
    saving.value = true;
    saved.value = false;
    error.value = null;
    try {
      const response = await onboardingApi.saveSetup({ token, expected_revision: identity.revision, settings: assembled });
      if (current !== epoch) return;
      if (
        !validProgress(response) ||
        response.setup_id !== identity.setup_id ||
        response.client_id !== identity.client_id ||
        response.revision <= identity.revision
      )
        throw new Error('invalid response');
      progress.value = copy(response);
      // A confirmed response updates the revision; edits made during the request are never lost.
      if (JSON.stringify(settings.value) === JSON.stringify(assembled)) {
        settings.value = copy(response.settings);
        saved.value = true;
      }
    } catch (value) {
      if (current === epoch) {
        conflict.value = value instanceof OnboardingPublicHttpError && value.status === 409;
        error.value =
          value instanceof OnboardingPublicHttpError
            ? value.message
            : 'We could not save your extraction settings. Your changes are still here. Please try again.';
      }
    } finally {
      if (current === epoch) saving.value = false;
    }
  }

  return {
    progress,
    questions,
    settings,
    loading,
    saving,
    saved,
    conflict,
    error,
    questionsError,
    ready,
    detectionUnavailable,
    reset,
    load,
    reload,
    fetchQuestions,
    setPractices,
    setWindow,
    setInsurance,
    setCarriers,
    setNoteReading,
    save
  };
});
