<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onboardingApi } from '@/api/onboarding';
import { useClientStore } from '@/stores/clients';
import { WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; 'client-created': [clientId: string] }>();

/** Existing client-create default, preserved verbatim: the setup/edit screen carries the real value later. */
const SHELL_PRODUCT_TYPE = 'Custom';
// The operator link must survive the app base path, and the token stays after the fragment only.
const INVITE_BASE_PATH = `${import.meta.env.BASE_URL ?? '/'}`.replace(/\/?$/, '/');

/** Closed operator copy for transport failures; a blocked invite adds the server's own readiness reasons. */
const CLOSED_MINT_FAILURES: Record<number, string> = {
  401: 'Your session expired. Sign in again before creating the link.',
  403: 'Your account cannot create an invite for this client.',
  404: 'This client is not open for onboarding yet.',
  409: 'Client created. Next step: add the clinic and its customer key, then create the invite.',
  429: 'Too many link requests. Wait a moment and try again.'
};
const CLOSED_CREATE_FAILURE = 'The client could not be created. Check the name and try again.';
const CLOSED_MINT_FALLBACK = 'The invite link could not be created. Your entries are preserved.';

const clientStore = useClientStore();
const clientName = ref('');
const attempted = ref(false);
const submitting = ref(false);
const failure = ref<string | null>(null);
const inviteLink = ref<string | null>(null);
const expiresInDays = ref(0);
const copyState = ref<'idle' | 'copied' | 'manual'>('idle');
const createdClientId = ref<string | null>(null);
let epoch = 0;

const nameMessage = computed(() => (clientName.value.trim() ? '' : 'Enter the client name.'));
const canSubmit = computed(() => !nameMessage.value);
const showsNameMessage = computed(() => Boolean(nameMessage.value) && (attempted.value || clientName.value.length > 0));

function reset(): void {
  epoch += 1;
  clientName.value = '';
  attempted.value = false;
  submitting.value = false;
  failure.value = null;
  inviteLink.value = null;
  expiresInDays.value = 0;
  copyState.value = 'idle';
  createdClientId.value = null;
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset();
  }
);

function blockedInviteReasons(errorValue: unknown): string[] {
  if (!(errorValue instanceof WorkflowBuilderHttpError)) return [];
  const body = errorValue.data;
  if (!body || typeof body !== 'object') return [];
  const envelope = (body as { data?: unknown }).data ?? body;
  const diagnostics = envelope && typeof envelope === 'object' ? (envelope as { diagnostics?: unknown }).diagnostics : undefined;
  if (!Array.isArray(diagnostics)) return [];
  return diagnostics
    .map((entry) => (entry && typeof entry === 'object' ? (entry as { message?: unknown }).message : null))
    .filter((message): message is string => typeof message === 'string' && message.trim().length > 0)
    .map((message) => message.trim());
}

function closedMintFailure(errorValue: unknown): string {
  if (!(errorValue instanceof WorkflowBuilderHttpError)) return CLOSED_MINT_FALLBACK;
  if (errorValue.status === 409) {
    const [reason] = blockedInviteReasons(errorValue);
    if (reason) {
      const firstReason = reason.replace(/\.$/, '');
      return `Client created, but the invite is not ready yet. ${firstReason}. Next step: add the clinic, then create the invite.`;
    }
  }
  return CLOSED_MINT_FAILURES[errorValue.status] ?? CLOSED_MINT_FALLBACK;
}

/** Create the client shell once, then mint the directed invite for that exact client. */
async function submit(): Promise<void> {
  attempted.value = true;
  if (!canSubmit.value || submitting.value) return;
  const requestEpoch = epoch;
  submitting.value = true;
  failure.value = null;
  try {
    let clientId = createdClientId.value;
    if (!clientId) {
      const created = await clientStore.createClient({ client_name: clientName.value.trim(), product_type: SHELL_PRODUCT_TYPE });
      if (requestEpoch !== epoch) return;
      clientId = String(created?.id ?? '');
      if (!clientId) {
        failure.value = CLOSED_CREATE_FAILURE;
        return;
      }
      createdClientId.value = clientId;
      emit('client-created', clientId);
    }
    const response = await onboardingApi.mintInvite(clientId);
    if (requestEpoch !== epoch) return;
    const token = response.data.link.split('#')[1] ?? '';
    inviteLink.value = `${window.location.origin}${INVITE_BASE_PATH}o/${clientId}#${token}`;
    expiresInDays.value = response.data.expires_days;
    copyState.value = 'idle';
  } catch (errorValue) {
    if (requestEpoch !== epoch) return;
    failure.value = createdClientId.value ? closedMintFailure(errorValue) : CLOSED_CREATE_FAILURE;
  } finally {
    if (requestEpoch === epoch) submitting.value = false;
  }
}

async function copyLink(): Promise<void> {
  const link = inviteLink.value;
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    copyState.value = 'copied';
  } catch {
    copyState.value = 'manual';
  }
}
</script>

<template>
  <v-dialog :model-value="props.modelValue" max-width="640" @update:model-value="emit('update:modelValue', $event)">
    <v-card data-test="invite-dialog">
      <v-card-title class="text-h6">New client</v-card-title>
      <v-card-text>
        <template v-if="inviteLink">
          <v-alert data-test="invite-ready" type="success" variant="tonal">
            The invite link is ready. Send it to the contact so they can define the workflow.
          </v-alert>
          <div class="d-flex flex-wrap align-center ga-2 mt-4">
            <code class="text-body-2" data-test="invite-link">{{ inviteLink }}</code>
            <v-btn data-test="invite-copy" size="small" color="primary" variant="tonal" @click="copyLink">Copy link</v-btn>
          </div>
          <div class="text-body-2 mt-2" data-test="invite-expiry">
            The link works for {{ expiresInDays }} days. After it expires, create a new one.
          </div>
          <v-alert v-if="copyState === 'copied'" data-test="invite-copied" type="info" variant="tonal" class="mt-3">
            Link copied. Paste it in the message you send to the contact.
          </v-alert>
          <v-alert v-else-if="copyState === 'manual'" data-test="invite-copy-manual" type="warning" variant="tonal" class="mt-3">
            Your browser blocked the automatic copy. Select the link above and copy it by hand.
          </v-alert>
          <div class="text-subtitle-2 mt-4">What the contact will do</div>
          <ol class="text-body-2 pl-5" data-test="invite-preview">
            <li>The contact opens the link and confirms the client.</li>
            <li>The contact chooses how the verifications work.</li>
            <li>The contact sends the choices back for your review.</li>
          </ol>
        </template>
        <template v-else>
          <v-text-field
            v-model="clientName"
            data-test="invite-name"
            label="Client name"
            variant="outlined"
            color="primary"
            hide-details="auto"
            :error="showsNameMessage"
          />
          <div v-if="showsNameMessage" data-test="invite-name-message" class="text-error text-body-2 mt-1">{{ nameMessage }}</div>
          <v-alert v-if="failure" data-test="invite-error" type="warning" variant="tonal" class="mt-4">{{ failure }}</v-alert>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <template v-if="inviteLink">
          <v-btn data-test="invite-done" color="primary" variant="flat" @click="emit('update:modelValue', false)">Done</v-btn>
        </template>
        <template v-else>
          <v-btn data-test="invite-cancel" variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
          <v-btn
            data-test="invite-submit"
            color="primary"
            variant="flat"
            :loading="submitting"
            :disabled="submitting || !canSubmit"
            @click="submit"
          >
            Create client
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
