<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import DetectedQuestion from '@/components/onboarding/DetectedQuestion.vue';
import NoteReadingChoice from '@/components/onboarding/NoteReadingChoice.vue';
import RescueForm from '@/components/onboarding/RescueForm.vue';
import WindowQuestions from '@/components/onboarding/WindowQuestions.vue';
import { useOnboardingAnswersStore } from '@/stores/onboardingAnswers';
import { useOnboardingRescueStore } from '@/stores/onboardingRescue';
import { normalizeQuestionOptions } from '@/components/onboarding/questionOptions';
import { canSubmitWindow } from '@/components/onboarding/windowRequirements';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type { OnboardingDraftRequest, OnboardingWindowField } from '@/types/onboarding';

const route = useRoute();
const store = useOnboardingRescueStore();
const answersStore = useOnboardingAnswersStore();
const { redemption, submission, state, error } = storeToRefs(store);
const { questions, draftQuestionAnswers, windowAnswers, noteReading, loading, ready, detectionUnavailable } = storeToRefs(answersStore);
const inviteDays = computed(() => Math.max(1, Math.ceil((redemption.value?.ttl_seconds ?? 0) / 86400)));
/** The window leg the server accepts; every required answer is pre-filled from the recommendation. */
const canSubmit = computed(() => canSubmitWindow(windowAnswers.value));
/** A detected question with zero renderable options is dropped by its own component. */
const hasDetectedQuestions = computed(() =>
  (questions.value?.questions ?? []).some((question) => normalizeQuestionOptions(question.options).length > 0)
);

/** The token travels only after '#': read it client-side, never from the path or query. */
function fragmentToken(): string {
  return window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
}

onMounted(async () => {
  if (state.value !== 'IDLE') return;
  const token = fragmentToken();
  store.start(token, String(route.params.id ?? ''));
  await store.redeem();
  if (store.state !== 'READY') return;
  try {
    await answersStore.load(token);
  } catch (errorValue) {
    state.value = 'REJECTED';
    error.value =
      errorValue instanceof OnboardingPublicHttpError
        ? errorValue.message
        : 'This onboarding link cannot be used. Ask your administrator for a new link.';
  }
});

function setWindowAnswer(field: OnboardingWindowField, value: unknown): void {
  answersStore.setWindow(field, value);
}

async function submit(request?: OnboardingDraftRequest): Promise<void> {
  if (!ready.value && request) {
    await store.submit(request);
    return;
  }
  if (!ready.value) return;
  state.value = 'SUBMITTING';
  error.value = null;
  try {
    submission.value = await answersStore.submit();
    state.value = 'SUBMITTED';
  } catch (errorValue) {
    state.value = 'READY';
    error.value =
      errorValue instanceof OnboardingPublicHttpError
        ? errorValue.message
        : 'We could not save these answers. Please review them and try again.';
  }
}
</script>

<template>
  <div class="d-flex justify-center align-center pa-6" style="min-height: 100vh">
    <v-card max-width="680" width="100%" elevation="1">
      <v-card-text class="pa-8">
        <h2 class="text-h4 mb-2">Set up how your verifications work</h2>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Answer a few questions about your practice. Your administrator reviews them before anything starts.
        </p>
        <v-alert v-if="state === 'REDEEMING'" data-test="rescue-loading" type="info" variant="tonal"
          >Checking your onboarding link…</v-alert
        >
        <v-alert v-else-if="state === 'REJECTED'" data-test="rescue-error" type="error" variant="tonal">{{
          error ?? 'This onboarding link cannot be used. Ask your administrator for a new link.'
        }}</v-alert>
        <template v-else-if="state === 'SUBMITTED' && submission">
          <v-alert data-test="rescue-receipt" type="success" variant="tonal">
            Your choices were sent. Your administrator reviews them before anything starts.
          </v-alert>
        </template>
        <template v-else>
          <v-alert v-if="error" data-test="rescue-error" type="warning" variant="tonal" class="mb-4">{{ error }}</v-alert>
          <v-alert type="info" variant="tonal" class="mb-4">
            This link is only for you and stays usable for about {{ inviteDays }} more days.
          </v-alert>
          <v-alert v-if="loading" data-test="questions-loading" type="info" variant="tonal" class="mb-4">Preparing your questions…</v-alert>
          <template v-if="(state === 'READY' || state === 'SUBMITTING') && ready && questions">
            <v-alert v-if="detectionUnavailable" data-test="detection-unavailable" type="warning" variant="tonal" class="mb-4">
              We could not read your practice yet — answer these and we will confirm.
            </v-alert>
            <h3 v-if="hasDetectedQuestions" class="text-h6 mb-3">Your checks</h3>
            <DetectedQuestion
              v-for="question in questions.questions"
              :key="question.question_key"
              :question="question"
              :model-value="draftQuestionAnswers[question.question_key]"
              @update:model-value="answersStore.setDraftQuestion(question.question_key, $event)"
            />
            <h3 class="text-h6 mb-3 mt-6">Your schedule</h3>
            <WindowQuestions :questions="questions.window_questions" :model-value="windowAnswers" @update:field="setWindowAnswer" />
            <h3 class="text-h6 mb-3 mt-6">Your notes</h3>
            <NoteReadingChoice
              :note-reading="questions.note_reading"
              :model-value="noteReading.mode"
              @update:model-value="answersStore.setNoteReading($event)"
            />
            <v-btn
              data-test="rescue-submit"
              color="primary"
              variant="flat"
              block
              :loading="state === 'SUBMITTING'"
              :disabled="!canSubmit"
              @click="submit()"
            >
              Submit my onboarding choices
            </v-btn>
          </template>
          <RescueForm v-else-if="state === 'READY' || state === 'SUBMITTING'" :submitting="state === 'SUBMITTING'" @submit="submit" />
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>
