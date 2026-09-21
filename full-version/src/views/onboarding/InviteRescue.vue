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
import { clientLabel } from '@/components/onboarding/clientLabels';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type { OnboardingDraftRequest, OnboardingWindowField } from '@/types/onboarding';

const route = useRoute();
const store = useOnboardingRescueStore();
const answersStore = useOnboardingAnswersStore();
const { redemption, submission, state, error } = storeToRefs(store);
const { questions, draftQuestionAnswers, windowAnswers, noteReading, loading, ready, detectionUnavailable } = storeToRefs(answersStore);
const inviteDays = computed(() => Math.max(1, Math.ceil((redemption.value?.ttl_seconds ?? 0) / 86400)));

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
        <h2 class="text-h4 mb-2">Client onboarding</h2>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Choose the verified benefits this client's workflow should cover. Your administrator double-checks these choices before anything
          is activated.
        </p>
        <v-alert v-if="state === 'REDEEMING'" data-test="rescue-loading" type="info" variant="tonal"
          >Checking your onboarding link…</v-alert
        >
        <v-alert v-else-if="state === 'REJECTED'" data-test="rescue-error" type="error" variant="tonal">{{
          error ?? 'This onboarding link cannot be used. Ask your administrator for a new link.'
        }}</v-alert>
        <template v-else-if="state === 'SUBMITTED' && submission">
          <v-alert data-test="rescue-receipt" type="success" variant="tonal">
            Your onboarding choices were submitted. Version {{ submission.version.version_id }} is now
            {{ clientLabel(submission.version.state) }}.
          </v-alert>
          <p class="text-body-2 mt-4">Your administrator will double-check these choices before anything is activated.</p>
        </template>
        <template v-else>
          <v-alert v-if="error" data-test="rescue-error" type="warning" variant="tonal" class="mb-4">{{ error }}</v-alert>
          <v-alert type="info" variant="tonal" class="mb-4">
            This link is only for the client it was created for and stays usable for about {{ inviteDays }} more day(s).
          </v-alert>
          <v-alert v-if="loading" data-test="questions-loading" type="info" variant="tonal" class="mb-4">Preparing your questions…</v-alert>
          <template v-if="(state === 'READY' || state === 'SUBMITTING') && ready && questions">
            <v-alert v-if="detectionUnavailable" data-test="detection-unavailable" type="warning" variant="tonal" class="mb-4">
              We could not read your practice yet — answer these and we will confirm.
            </v-alert>
            <DetectedQuestion
              v-for="question in questions.questions"
              :key="question.question_key"
              :question="question"
              :model-value="draftQuestionAnswers[question.question_key]"
              @update:model-value="answersStore.setDraftQuestion(question.question_key, $event)"
            />
            <WindowQuestions :questions="questions.window_questions" :model-value="windowAnswers" @update:field="setWindowAnswer" />
            <NoteReadingChoice
              :note-reading="questions.note_reading"
              :model-value="noteReading.mode"
              @update:model-value="answersStore.setNoteReading($event)"
            />
            <v-btn data-test="rescue-submit" color="primary" variant="flat" block :loading="state === 'SUBMITTING'" @click="submit()">
              Submit my onboarding choices
            </v-btn>
          </template>
          <RescueForm v-else-if="state === 'READY' || state === 'SUBMITTING'" :submitting="state === 'SUBMITTING'" @submit="submit" />
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>
