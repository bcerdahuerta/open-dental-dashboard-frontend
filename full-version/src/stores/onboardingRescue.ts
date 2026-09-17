import { defineStore } from 'pinia';
import { ref } from 'vue';
import { onboardingApi } from '@/api/onboarding';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type { OnboardingDraftRequest, OnboardingRedemption, OnboardingRescueState, OnboardingSubmitResult } from '@/types/onboarding';

const GENERIC_REJECTION = 'This onboarding link cannot be used. Ask your administrator for a new link.';

/**
 * Public rescue state. The invite token is page memory only: it is never written to
 * localStorage/sessionStorage, never placed in a URL path or query, never logged, and
 * never sent as an Authorization header. The public calls use plain fetch.
 */
export const useOnboardingRescueStore = defineStore('onboardingRescue', () => {
  const token = ref('');
  const locator = ref('');
  const redemption = ref<OnboardingRedemption | null>(null);
  const submission = ref<OnboardingSubmitResult | null>(null);
  const state = ref<OnboardingRescueState>('IDLE');
  const error = ref<string | null>(null);

  function start(inviteToken: string, inviteLocator: string): void {
    token.value = inviteToken;
    locator.value = inviteLocator;
    redemption.value = null;
    submission.value = null;
    error.value = null;
    if (!inviteToken) {
      state.value = 'REJECTED';
      error.value = 'This onboarding link is incomplete. Ask your administrator for a new link.';
      return;
    }
    state.value = 'REDEEMING';
  }

  async function redeem(): Promise<void> {
    if (!token.value || state.value !== 'REDEEMING') return;
    try {
      redemption.value = await onboardingApi.redeem(token.value);
      state.value = 'READY';
    } catch (errorValue) {
      state.value = 'REJECTED';
      error.value = errorValue instanceof OnboardingPublicHttpError ? errorValue.message : GENERIC_REJECTION;
    }
  }

  async function submit(draft: OnboardingDraftRequest): Promise<void> {
    if (!token.value || !redemption.value || state.value !== 'READY') return;
    state.value = 'SUBMITTING';
    error.value = null;
    try {
      submission.value = await onboardingApi.submit({ client_id: redemption.value.client_id, token: token.value, draft });
      state.value = 'SUBMITTED';
    } catch (errorValue) {
      state.value = 'READY';
      error.value = errorValue instanceof OnboardingPublicHttpError ? errorValue.message : 'This onboarding draft could not be submitted.';
    }
  }

  function clear(): void {
    token.value = '';
    locator.value = '';
    redemption.value = null;
    submission.value = null;
    error.value = null;
    state.value = 'IDLE';
  }

  return { token, locator, redemption, submission, state, error, start, redeem, submit, clear };
});
