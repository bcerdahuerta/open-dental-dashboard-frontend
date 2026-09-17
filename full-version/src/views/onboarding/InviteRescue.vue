<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import RescueForm from '@/components/onboarding/RescueForm.vue';
import { useOnboardingRescueStore } from '@/stores/onboardingRescue';
import { clientLabel } from '@/components/onboarding/clientLabels';
import type { OnboardingDraftRequest } from '@/types/onboarding';

const route = useRoute();
const store = useOnboardingRescueStore();
const { redemption, submission, state, error } = storeToRefs(store);
const inviteDays = computed(() => Math.max(1, Math.ceil((redemption.value?.ttl_seconds ?? 0) / 86400)));

/** The token travels only after '#': read it client-side, never from the path or query. */
function fragmentToken(): string {
  return window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
}

onMounted(async () => {
  if (state.value !== 'IDLE') return;
  store.start(fragmentToken(), String(route.params.id ?? ''));
  await store.redeem();
});

async function submit(request: OnboardingDraftRequest): Promise<void> {
  await store.submit(request);
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
          <RescueForm v-if="state === 'READY' || state === 'SUBMITTING'" :submitting="state === 'SUBMITTING'" @submit="submit" />
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>
