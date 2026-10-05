<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DetectedQuestion from '@/components/onboarding/DetectedQuestion.vue';
import NoteReadingChoice from '@/components/onboarding/NoteReadingChoice.vue';
import WindowQuestions from '@/components/onboarding/WindowQuestions.vue';
import ExtractionReview from '@/components/onboarding/ExtractionReview.vue';
import { useOnboardingAnswersStore } from '@/stores/onboardingAnswers';
import { onboardingApi } from '@/api/onboarding';
import { canSubmitWindow } from '@/components/onboarding/windowRequirements';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type { ExtractionLastCheckSource, OnboardingWindowField } from '@/types/onboarding';

const route = useRoute();
const store = useOnboardingAnswersStore();
const { progress, questions, settings, loading, saving, saved, conflict, error, questionsError, detectionUnavailable } = storeToRefs(store);
const checking = ref(true);
const legacy = ref(false);
const entryError = ref<string | null>(null);
const step = ref(0);
const returnToReview = ref(false);
const heading = ref<HTMLElement | null>(null);
let entryEpoch = 0;
let entryKey = '';
const sections = ['Practice', 'Schedule', 'Insurance information', 'Review'];
const practiceQuestion = computed(() => questions.value?.questions.find(q => q.question_key === 'practices_in_scope'));
const insuranceQuestions = computed(() => questions.value?.questions.filter(q => ['last_check_source', 'eligibility_only_carriers'].includes(q.question_key)) ?? []);
const canContinue = computed(() => {
  if (step.value === 1) return !practiceQuestion.value?.options.length || !!settings.value.practice_refs?.length;
  if (step.value === 2) return canSubmitWindow(settings.value.window ?? {});
  if (step.value === 3) return !!settings.value.insurance?.last_check_source;
  return true;
});
async function move(next: number): Promise<void> {
  step.value = next;
  await nextTick(); heading.value?.focus();
}
async function enter(): Promise<void> {
  const key = `${String(route.params.id ?? '')}|${window.location.hash}`;
  if (key === entryKey) return;
  entryKey = key;
  const current = ++entryEpoch;
  store.reset(); step.value = 0; returnToReview.value = false; checking.value = true; legacy.value = false; entryError.value = null;
  const token = window.location.hash.slice(1);
  try {
    if (!token) throw new Error('missing link');
    const redeemed = await onboardingApi.redeem(token);
    if (current !== entryEpoch) return;
    const routeClient = String(route.params.id ?? '');
    if (routeClient && redeemed.client_id !== routeClient) throw new Error('wrong client');
    if (!redeemed.setup_id) { legacy.value = true; return; }
    await store.load(token);
    if (current !== entryEpoch) return;
    if (progress.value && (progress.value.setup_id !== redeemed.setup_id || progress.value.client_id !== redeemed.client_id)) {
      store.reset(); throw new Error('wrong setup');
    }
  } catch (value) {
    if (current === entryEpoch) entryError.value = value instanceof OnboardingPublicHttpError ? value.message : 'This setup link cannot be used. Ask your administrator for a new link.';
  } finally {
    if (current === entryEpoch) checking.value = false;
  }
}
function next(): void {
  if (!canContinue.value) return;
  if (step.value === 3 && settings.value.insurance?.eligibility_only_carriers === undefined) store.setCarriers([]);
  if (returnToReview.value) { returnToReview.value = false; void move(4); }
  else void move(step.value + 1);
}
function edit(section: number): void { returnToReview.value = true; void move(section); }
function setWindow(field: OnboardingWindowField, value: unknown): void {
  // WindowQuestions emits the type appropriate to its server-authored field.
  store.setWindow(field, value as never);
}
function setInsurance(key: string, value: unknown): void {
  if (key === 'last_check_source') store.setInsurance('last_check_source', value as ExtractionLastCheckSource);
  if (key === 'eligibility_only_carriers') store.setCarriers(value as string[]);
}
onMounted(() => { window.addEventListener('hashchange', enter); void enter(); });
watch(() => route.params.id, () => { void enter(); });
onBeforeUnmount(() => { ++entryEpoch; window.removeEventListener('hashchange', enter); store.reset(); });
</script>

<template>
  <v-container class="py-6">
    <v-row justify="center"><v-col cols="12" md="10" lg="8">
      <UiParentCard title="Set up your practice">
        <h1 ref="heading" tabindex="-1" class="text-h4 mb-3">{{ questions?.client_name || 'Set up your practice' }}</h1>
        <v-alert v-if="checking || loading" data-test="rescue-loading" type="info" variant="tonal">Loading your setup…</v-alert>
        <v-alert v-else-if="legacy" data-test="renewal-needed" type="warning" variant="tonal">
          This link needs to be renewed for extraction setup. Ask your administrator for a new setup link. Nothing has been saved or submitted from this screen.
        </v-alert>
        <v-alert v-else-if="entryError || (!progress && error)" data-test="rescue-error" type="error" variant="tonal">{{ entryError || error }}</v-alert>
        <template v-else-if="progress">
          <v-alert v-if="error" data-test="rescue-error" role="alert" type="warning" variant="tonal" class="mb-4">{{ error }}</v-alert>
          <template v-if="conflict">
            <p class="text-body-1 mb-3">Your local changes are still here. Review them before reloading. Reload replaces them with the latest saved settings.</p>
            <v-btn data-test="setup-reload" variant="outlined" color="primary" class="mb-4" @click="store.reload()">Reload saved settings and discard local changes</v-btn>
          </template>
          <v-alert v-if="questionsError || detectionUnavailable" data-test="detection-unavailable" type="warning" variant="tonal" class="mb-4">
            {{ questionsError || 'Practice and insurer choices are unavailable right now. Your saved selections are kept. Retry before saving selections that need verification.' }}
            <v-btn data-test="questions-retry" variant="text" color="primary" class="mt-2" @click="store.fetchQuestions()">Load questions again</v-btn>
          </v-alert>
          <v-alert v-if="saved" data-test="extraction-saved" role="status" type="success" variant="tonal" class="mb-4">
            Extraction settings saved. Your full setup has not been submitted yet.
          </v-alert>
          <template v-if="step === 0">
            <h2 class="text-h5 mb-3">Data extraction</h2>
            <p class="text-body-1 mb-3">Choose which practices to include, when to read visits, and where to find insurance information.</p>
            <p class="text-body-2 mb-6">Changes stay on this page until you choose Save extraction settings. Saving does not start services or submit your full setup.</p>
            <v-btn data-test="extraction-start" color="primary" variant="flat" block @click="move(questions ? 1 : 4)">
              {{ Object.keys(progress.settings).length ? 'Continue extraction setup' : 'Start extraction setup' }}
            </v-btn>
          </template>
          <template v-else>
            <p data-test="extraction-progress" class="text-body-2 mb-2">Data extraction · Step {{ step }} of 4</p>
            <h2 class="text-h5 mb-5">{{ sections[step - 1] }}</h2>
            <DetectedQuestion v-if="step === 1 && practiceQuestion" :question="practiceQuestion" :model-value="settings.practice_refs"
              @update:model-value="store.setPractices($event as string[])" />
            <WindowQuestions v-if="step === 2 && questions" :questions="questions.window_questions" :model-value="settings.window ?? {}" @update:field="setWindow" />
            <template v-if="step === 3 && questions">
              <DetectedQuestion v-for="question in insuranceQuestions" :key="question.question_key" :question="question"
                :model-value="question.question_key === 'last_check_source' ? settings.insurance?.last_check_source : settings.insurance?.eligibility_only_carriers"
                @update:model-value="setInsurance(question.question_key, $event)" />
              <NoteReadingChoice :note-reading="questions.note_reading" :model-value="settings.note_reading ?? {}"
                @update:enabled="store.setNoteReading('enabled', $event)" @update:mode="store.setNoteReading('mode', $event)" />
            </template>
            <ExtractionReview v-if="step === 4" :settings="settings" :questions="questions" :disabled="saving" @edit="edit" />
            <p v-if="!canContinue && step < 4" class="text-body-2 mb-3" role="status">Answer the questions above to continue.</p>
            <v-row class="mt-3">
              <v-col cols="12" sm="4"><v-btn data-test="extraction-back" variant="outlined" color="secondary" block :disabled="saving" @click="move(step === 4 && !questions ? 0 : step - 1)">Back</v-btn></v-col>
              <v-col cols="12" sm="8">
                <v-btn v-if="step < 4" data-test="extraction-continue" variant="flat" color="primary" block :disabled="!canContinue" @click="next">
                  {{ returnToReview ? 'Return to review' : 'Continue' }}
                </v-btn>
                <v-btn v-else data-test="extraction-save" variant="flat" color="primary" block :loading="saving" :disabled="saving || conflict || loading" @click="store.save()">Save extraction settings</v-btn>
              </v-col>
            </v-row>
          </template>
        </template>
      </UiParentCard>
    </v-col></v-row>
  </v-container>
</template>
