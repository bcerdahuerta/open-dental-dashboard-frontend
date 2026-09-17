<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { onBeforeRouteLeave } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ClientComposerPanel from '@/components/onboarding/ClientComposerPanel.vue';
import InviteClientDialog from '@/components/onboarding/InviteClientDialog.vue';
import { clientLabel } from '@/components/onboarding/clientLabels';
import { useOnboardingComposerStore } from '@/stores/onboardingComposer';
import { useClientStore } from '@/stores/clients';

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

watch(selectedClientId, (next) => store.selectClient(next || null));
onMounted(() => {
  void clientStore.fetchClients();
});
onBeforeRouteLeave(() => store.cancel());
onBeforeUnmount(() => store.cancel());
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Client Onboarding">
        <template v-slot:action>
          <v-btn data-test="composer-invite-client" color="primary" variant="flat" @click="inviteDialog = true">Invite client</v-btn>
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
      <v-col cols="12" lg="7">
        <UiParentCard title="Closed client choices">
          <ClientComposerPanel :loading="loading" @draft="store.mintDraft" @mint-invite="store.mintInvite" />
        </UiParentCard>
      </v-col>
      <v-col cols="12" lg="5">
        <UiParentCard title="Operator receipts">
          <v-alert v-if="invite" data-test="composer-invite" type="success" variant="tonal" class="mb-3">
            Invite link ready for {{ invite.expiresInDays }} days. Copy it and deliver it to the client contact.
            <div class="text-body-2 mt-2">
              <code data-test="composer-invite-link">{{ invite.link }}</code>
            </div>
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
