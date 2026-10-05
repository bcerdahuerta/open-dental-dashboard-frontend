<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { onBeforeRouteLeave } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ClientComposerPanel from '@/components/onboarding/ClientComposerPanel.vue';
import InviteClientDialog from '@/components/onboarding/InviteClientDialog.vue';
import { clientLabel } from '@/components/onboarding/clientLabels';
import { useOnboardingComposerStore } from '@/stores/onboardingComposer';
import { useClientStore } from '@/stores/clients';
import { onboardingApi } from '@/api/onboarding';
import type { ExtractionSetupMetadata } from '@/types/onboarding';

const store = useOnboardingComposerStore();
const clientStore = useClientStore();
const { clients } = storeToRefs(clientStore);
const { draft, diagnostics, invite, receipts, loading, error } = storeToRefs(store);
const selectedClientId = ref('');
const inviteDialog = ref(false);
const page = { title: 'Onboarding Composer' };
const breadcrumbs = [
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Onboarding Composer', disabled: true, href: '#' }
];

// Metadata offers identities for explicit selection; it never grants a public capability.
const setupId = ref('');
const setups = ref<ExtractionSetupMetadata[]>([]);
const listLoading = ref(false);
const listError = ref<string | null>(null);
const hasMore = ref(false);
const afterSetupId = ref<string | null>(null);
let inviteEpoch = 0;
let listEpoch = 0;
const selectedSetup = computed(() => setups.value.find(item => item.setup_id === setupId.value));
function timestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-US');
}
const setupItems = computed(() => [
  { title: 'Choose a saved setup', value: '' },
  ...setups.value.map((item, index) => ({ value: item.setup_id,
    title: `Setup ${index + 1} · Created ${timestamp(item.created_at)} · Updated ${timestamp(item.updated_at)} · Revision ${item.revision}` }))
]);
watch(selectedClientId, (next) => {
  ++inviteEpoch; ++listEpoch;
  setupId.value = ''; setups.value = []; hasMore.value = false; afterSetupId.value = null;
  listLoading.value = false; listError.value = null;
  store.selectClient(next || null); loading.value = false;
  if (next) void loadSetups();
}, { flush: 'sync' });
async function loadSetups(more = false): Promise<void> {
  const clientId = selectedClientId.value;
  if (!clientId || listLoading.value || loading.value || (more && (!hasMore.value || !afterSetupId.value))) return;
  const current = ++listEpoch;
  const cursor = more ? afterSetupId.value! : undefined;
  if (!more) {
    setupId.value = ''; setups.value = []; hasMore.value = false; afterSetupId.value = null; invite.value = null;
  }
  listLoading.value = true; listError.value = null;
  try {
    const response = await onboardingApi.listSetups(clientId, cursor);
    if (current !== listEpoch || clientId !== selectedClientId.value) return;
    const page = response.data;
    if (!Array.isArray(page.setups) || page.setups.length > 25 || (page.has_more && !page.next_after_setup_id)) throw new Error('Invalid setup list');
    setups.value = more ? [...setups.value, ...page.setups.filter(item => !setups.value.some(known => known.setup_id === item.setup_id))] : page.setups;
    hasMore.value = page.has_more; afterSetupId.value = page.next_after_setup_id;
  } catch {
    if (current === listEpoch) listError.value = 'Saved setups could not be loaded. Refresh to try again. No setup has been selected automatically.';
  } finally {
    if (current === listEpoch) listLoading.value = false;
  }
}
async function mintSetup(renew = false): Promise<void> {
  const clientId = selectedClientId.value;
  if (!clientId || loading.value || listLoading.value || (renew && !selectedSetup.value)) return;
  const renewalId = renew ? selectedSetup.value!.setup_id : undefined;
  const current = inviteEpoch;
  loading.value = true;
  error.value = null;
  invite.value = null;
  try {
    const response = await onboardingApi.mintSetup(clientId, renewalId);
    if (current !== inviteEpoch) return;
    const token = response.data.link.split('#')[1];
    if (!response.data.setup_id || !token || (renewalId && response.data.setup_id !== renewalId)) throw new Error('Invalid setup link');
    const base = `${import.meta.env.BASE_URL ?? '/'}`.replace(/\/?$/, '/');
    invite.value = {
      link: `${window.location.origin}${base}o/${clientId}#${token}`,
      expiresAt: response.data.expires_at,
      expiresInDays: response.data.expires_days
    };
  } catch {
    if (current === inviteEpoch) error.value = 'The extraction setup link could not be created. Please try again.';
  } finally {
    if (current === inviteEpoch) loading.value = false;
  }
}
onMounted(() => {
  void clientStore.fetchClients();
});
onBeforeRouteLeave(() => store.cancel());
onBeforeUnmount(() => { ++inviteEpoch; ++listEpoch; setupId.value = ''; setups.value = []; invite.value = null; store.cancel(); });
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Client Onboarding">
        <template v-slot:action>
          <v-btn data-test="composer-invite-client" color="primary" variant="flat" @click="inviteDialog = true">New client</v-btn>
        </template>
        <v-row align="center">
          <v-col cols="12" md="8">
            <v-select
              v-model="selectedClientId"
              data-test="composer-client"
              :items="clients"
              item-title="client_name"
              item-value="id"
              label="Authorized client"
              variant="outlined"
              color="primary"
              hide-details="auto"
            />
          </v-col>
        </v-row>
        <v-alert v-if="error" data-test="composer-error" type="warning" variant="tonal" class="mt-4">{{ error }}</v-alert>
        <v-alert v-else type="info" variant="tonal" class="mt-4">
          The composer sends the closed client choices to the server, which recomputes the draft. Nothing is activated from this screen.
        </v-alert>
      </UiParentCard>
    </v-col>
    <template v-if="store.clientId">
      <v-col cols="12">
        <UiParentCard title="Extraction setup links">
          <p class="text-body-1 mb-4">Choose an existing saved setup to renew its link and preserve its progress, or start a separate new setup. Nothing is submitted or activated here.</p>
          <v-alert v-if="listError" data-test="composer-setups-error" type="warning" variant="tonal" class="mb-4">{{ listError }}</v-alert>
          <v-select v-model="setupId" data-test="composer-saved-setup" :items="setupItems" item-title="title" item-value="value"
            label="Saved extraction setup" variant="outlined" color="primary" hide-details="auto" :loading="listLoading" :disabled="listLoading || loading" />
          <p v-if="!listLoading && !listError && !setups.length" class="text-body-2 mt-3">No saved extraction setups found for this client.</p>
          <v-row class="mt-3">
            <v-col cols="12" sm="6"><v-btn data-test="composer-renew-setup" variant="outlined" color="primary" block :loading="loading" :disabled="!selectedSetup || loading || listLoading" @click="mintSetup(true)">Renew selected setup link</v-btn></v-col>
            <v-col cols="12" sm="6"><v-btn data-test="composer-new-setup" variant="flat" color="primary" block :loading="loading" :disabled="loading || listLoading" @click="mintSetup()">Start new extraction setup</v-btn></v-col>
          </v-row>
          <div class="d-flex flex-wrap ga-2 mt-3">
            <v-btn data-test="composer-setups-refresh" variant="text" color="primary" :disabled="loading || listLoading" @click="loadSetups()">Refresh saved setups</v-btn>
            <v-btn v-if="hasMore" data-test="composer-setups-more" variant="text" color="primary" :loading="listLoading" :disabled="loading || listLoading" @click="loadSetups(true)">Load more setups</v-btn>
          </div>
          <p class="text-body-2 mt-2">The list contains dates and revisions only, not saved answers. After starting a new setup, refresh this list before selecting it for renewal.</p>
        </UiParentCard>
      </v-col>
      <v-col cols="12" lg="7">
        <UiParentCard title="Closed client choices">
          <ClientComposerPanel :loading="loading" @draft="store.mintDraft" @mint-invite="mintSetup()" />
        </UiParentCard>
      </v-col>
      <v-col cols="12" lg="5">
        <UiParentCard title="Operator receipts">
          <v-alert v-if="invite" data-test="composer-invite" type="success" variant="tonal" class="mb-3">
            Invite link ready for {{ invite.expiresInDays }} days. Copy it and deliver it to the client contact.
            <div class="text-body-2 mt-2 text-break">
              <code data-test="composer-invite-link">{{ invite.link }}</code>
            </div>
            <p class="text-body-2 mt-2">Renewing this link preserves this setup's saved extraction settings. Creating another link starts a separate setup.</p>
          </v-alert>
          <v-list v-if="receipts.length" density="compact" class="border rounded" data-test="composer-receipts">
            <v-list-item v-for="receipt in receipts" :key="receipt.receiptId" data-test="composer-receipt">
              <v-list-item-title>{{ clientLabel(receipt.kind) }}</v-list-item-title>
              <v-list-item-subtitle>{{ receipt.detail }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-alert v-else type="info" variant="tonal">No receipts for this client yet.</v-alert>
          <v-alert v-if="draft" data-test="composer-draft" type="info" variant="tonal" class="mt-3">
            Draft {{ clientLabel(draft.lifecycle) }} admitted with {{ draft.candidate.selected_atom_keys.length }} capabilities. Nothing is
            activated by this draft.
          </v-alert>
          <v-list v-if="diagnostics.length" density="compact" class="border rounded mt-3" data-test="composer-diagnostics">
            <v-list-item v-for="diagnostic in diagnostics" :key="`${diagnostic.code}-${diagnostic.subject_kind}`">
              <v-list-item-title>{{ diagnostic.message }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </UiParentCard>
      </v-col>
    </template>
  </v-row>
  <InviteClientDialog v-model="inviteDialog" />
</template>
