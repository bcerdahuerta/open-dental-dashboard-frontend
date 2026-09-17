import { defineStore } from 'pinia';
import { ref } from 'vue';
import { onboardingApi } from '@/api/onboarding';
import { WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';
import type { OnboardingDiagnostic, OnboardingDraftProjection, OnboardingDraftRequest } from '@/types/onboarding';

export interface OnboardingComposerReceipt {
  receiptId: number;
  kind: 'DRAFT' | 'INVITE';
  detail: string;
}

/** Operator copy link: origin + the short rescue path + the fragment token. */
export interface OnboardingInviteCopy {
  link: string;
  expiresAt: string;
  expiresInDays: number;
}

const GENERIC_DRAFT_FAILURE = 'The onboarding draft could not be created for this client.';

// The ops copy link must survive the app's base path (`/` in production builds).
const INVITE_BASE_PATH = `${import.meta.env.BASE_URL ?? '/'}`.replace(/\/?$/, '/');

function authorizeDenial(error: unknown): string | null {
  if (error instanceof WorkflowBuilderHttpError && (error.status === 403 || error.status === 404)) {
    return 'Onboarding authoring is not authorized for this client.';
  }
  return null;
}

/**
 * Authenticated composer state. Scoped to one client with epoch + Abort cancellation and
 * immutable receipts, without coupling to the blueprint store.
 */
export const useOnboardingComposerStore = defineStore('onboardingComposer', () => {
  const clientId = ref<string | null>(null);
  const draft = ref<OnboardingDraftProjection | null>(null);
  const diagnostics = ref<OnboardingDiagnostic[]>([]);
  const invite = ref<OnboardingInviteCopy | null>(null);
  const receipts = ref<OnboardingComposerReceipt[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let epoch = 0;
  let receiptSequence = 0;
  let controller: AbortController | null = null;

  function cancel(): void {
    controller?.abort();
    controller = null;
    epoch += 1;
  }

  function selectClient(next: string | null): void {
    cancel();
    clientId.value = next;
    draft.value = null;
    diagnostics.value = [];
    invite.value = null;
    receipts.value = [];
    error.value = null;
  }

  function record(kind: OnboardingComposerReceipt['kind'], detail: string): void {
    receipts.value = [...receipts.value, { receiptId: ++receiptSequence, kind, detail }];
  }

  function failure(errorValue: unknown): string {
    return authorizeDenial(errorValue) ?? GENERIC_DRAFT_FAILURE;
  }

  async function mintDraft(request: OnboardingDraftRequest): Promise<void> {
    const activeClient = clientId.value;
    if (!activeClient) return;
    const requestEpoch = epoch;
    controller = new AbortController();
    loading.value = true;
    error.value = null;
    diagnostics.value = [];
    try {
      const response = await onboardingApi.mintDraft(activeClient, request, controller.signal);
      if (requestEpoch !== epoch || clientId.value !== activeClient) return;
      draft.value = response.data.draft;
      diagnostics.value = response.data.diagnostics;
      if (response.data.draft) {
        const { selected_atom_keys, locked_atom_keys } = response.data.draft.candidate;
        record('DRAFT', `Draft receipt: ${selected_atom_keys.length} capabilities selected · ${locked_atom_keys.length} locked`);
      } else {
        error.value = 'The submitted onboarding choices were rejected.';
      }
    } catch (errorValue) {
      if (requestEpoch === epoch) error.value = failure(errorValue);
    } finally {
      if (requestEpoch === epoch) loading.value = false;
    }
  }

  async function mintInvite(): Promise<void> {
    const activeClient = clientId.value;
    if (!activeClient) return;
    const requestEpoch = epoch;
    loading.value = true;
    error.value = null;
    try {
      const response = await onboardingApi.mintInvite(activeClient);
      if (requestEpoch !== epoch || clientId.value !== activeClient) return;
      const token = response.data.link.split('#')[1] ?? '';
      invite.value = {
        link: `${window.location.origin}${INVITE_BASE_PATH}o/${activeClient}#${token}`,
        expiresAt: response.data.expires_at,
        expiresInDays: response.data.expires_days
      };
      record('INVITE', `Invite link ready for ${response.data.expires_days} days. Copy it and deliver it to the client contact.`);
    } catch (errorValue) {
      if (requestEpoch === epoch) error.value = failure(errorValue);
    } finally {
      if (requestEpoch === epoch) loading.value = false;
    }
  }

  return { clientId, draft, diagnostics, invite, receipts, loading, error, selectClient, mintDraft, mintInvite, cancel };
});
