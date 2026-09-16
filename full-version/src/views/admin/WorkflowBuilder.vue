<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { onBeforeRouteLeave } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import CatalogComposerPanel from '@/components/workflow-builder/CatalogComposerPanel.vue';
import PreviewDraftPanel from '@/components/workflow-builder/PreviewDraftPanel.vue';
import RootHistoryPanel from '@/components/workflow-builder/RootHistoryPanel.vue';
import ExceptionPanel from '@/components/workflow-builder/ExceptionPanel.vue';
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder';
import { useAuthStore } from '@/stores/auth';
import { useClientStore } from '@/stores/clients';
import { useClinicStore } from '@/stores/clinics';
import { WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';
import type { WorkflowAuthoringRequest, WorkflowCommandReceipt, WorkflowExceptionDelta } from '@/types/workflowBuilder';

const store = useWorkflowBuilderStore();
const authStore = useAuthStore();
const clientStore = useClientStore();
const clinicStore = useClinicStore();
const { user } = storeToRefs(authStore);
const { clients } = storeToRefs(clientStore);
const { clinics } = storeToRefs(clinicStore);
const { catalog, root, rootEtag, history, materialization, exceptionContext, exceptionHistory, receipts, loading, error } =
  storeToRefs(store);
const optionalAtomKeys = computed(() =>
  [
    ...new Set(
      Object.values(catalog.value?.archetype_facts ?? {}).flatMap((fact) =>
        Object.entries(fact.capability_states)
          .filter(([, state]) => state === 'OPTIONAL')
          .map(([atomKey]) => atomKey)
      )
    )
  ].sort()
);
const selectedClientId = ref('');
const page = { title: 'Workflow Builder' };
const breadcrumbs = [
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Workflow Builder', disabled: true, href: '#' }
];
const actionMessage = ref<string | null>(null);

async function loadClient(): Promise<void> {
  actionMessage.value = null;
  if (!selectedClientId.value) return;
  await store.load(selectedClientId.value);
  if (catalog.value && store.clientId === selectedClientId.value) await clinicStore.fetchClinics(selectedClientId.value);
}

async function handleCommandError(errorValue: unknown): Promise<void> {
  if (errorValue instanceof WorkflowBuilderHttpError && errorValue.status === 412) {
    actionMessage.value = 'Workflow Builder changed on the server. Refreshing the current state.';
    await store.refresh();
    return;
  }
  actionMessage.value =
    errorValue instanceof WorkflowBuilderHttpError && errorValue.status === 409
      ? 'Correct the current Workflow Builder state before trying again.'
      : 'Workflow Builder is unavailable for this client.';
}

async function retryReceipt(receipt: WorkflowCommandReceipt<unknown>): Promise<void> {
  actionMessage.value = null;
  try {
    await receipt.retry();
    await store.refresh();
  } catch (errorValue) {
    await handleCommandError(errorValue);
  }
}

async function preview(request: WorkflowAuthoringRequest): Promise<void> {
  actionMessage.value = null;
  try {
    await store.preview(request);
  } catch (errorValue) {
    await handleCommandError(errorValue);
  }
}

async function bootstrap(archetypeKey: string): Promise<void> {
  if (!catalog.value || root.value) return;
  actionMessage.value = null;
  try {
    await store.bootstrap(archetypeKey);
    await store.refresh();
  } catch (errorValue) {
    await handleCommandError(errorValue);
  }
}

async function versionAction(versionId: string, action: 'review' | 'approval' | 'discard', reasonCategory?: string): Promise<void> {
  actionMessage.value = null;
  try {
    if (action === 'review') await store.reviewVersion(versionId);
    else if (action === 'approval') await store.approveVersion(versionId);
    else await store.discardVersion(versionId, reasonCategory ?? 'CORRECTION');
    await store.refresh();
  } catch (errorValue) {
    await handleCommandError(errorValue);
  }
}

async function loadExceptionContext(value: { clinicId: string; baseVersionId: string }): Promise<void> {
  actionMessage.value = null;
  try {
    await store.loadExceptionContext(value.clinicId, value.baseVersionId);
    await store.loadExceptionHistory(value.clinicId);
  } catch (errorValue) {
    await handleCommandError(errorValue);
  }
}

async function refreshExceptionContext(clinicId: string, baseVersionId: string | null | undefined): Promise<void> {
  if (!baseVersionId || exceptionContext.value?.base_version.version_id !== baseVersionId) return;
  await store.loadExceptionContext(clinicId, baseVersionId);
}

async function createException(value: { clinicId: string; baseVersionId: string; delta: WorkflowExceptionDelta }): Promise<void> {
  actionMessage.value = null;
  try {
    await store.createException(value.clinicId, value.baseVersionId, value.delta);
    await store.loadExceptionHistory(value.clinicId);
    await refreshExceptionContext(value.clinicId, value.baseVersionId);
  } catch (errorValue) {
    await handleCommandError(errorValue);
  }
}

async function exceptionAction(value: { clinicId: string; exceptionId: string }, action: 'review' | 'approval'): Promise<void> {
  actionMessage.value = null;
  try {
    if (action === 'review') await store.reviewException(value.clinicId, value.exceptionId);
    else await store.approveException(value.clinicId, value.exceptionId);
    await store.loadExceptionHistory(value.clinicId);
    await refreshExceptionContext(
      value.clinicId,
      exceptionHistory.value?.exceptions.find((item) => item.exception_id === value.exceptionId)?.base_version_id
    );
  } catch (errorValue) {
    await handleCommandError(errorValue);
  }
}

onMounted(() => {
  void clientStore.fetchClients();
});
onBeforeRouteLeave(() => store.cancel());
onBeforeUnmount(() => store.cancel());

async function createDraft(): Promise<void> {
  const material = materialization.value;
  if (!material?.canonical_bytes || !material.digest || !rootEtag.value) return;
  actionMessage.value = null;
  try {
    await store.createDraft(
      {
        contract_version: 'assisted-authoring-v1',
        canonical_bytes: material.canonical_bytes,
        digest: material.digest
      },
      rootEtag.value
    );
    await store.refresh();
  } catch (errorValue) {
    await handleCommandError(errorValue);
  }
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Workflow Builder">
        <v-row align="center">
          <v-col cols="12" md="8">
            <v-select
              v-model="selectedClientId"
              data-test="load-client"
              :items="clients"
              item-title="client_name"
              item-value="id"
              label="Authorized client"
              variant="outlined"
              color="primary"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-btn
              data-test="load-client-button"
              color="primary"
              variant="flat"
              :loading="loading"
              :disabled="!selectedClientId"
              @click="loadClient"
              >Load closed catalog</v-btn
            >
          </v-col>
        </v-row>
        <v-alert v-if="error || actionMessage" type="warning" variant="tonal" class="mt-4">
          {{ actionMessage ?? error }}
        </v-alert>
      </UiParentCard>
    </v-col>
    <v-col cols="12" lg="6">
      <UiParentCard title="Closed Composer">
        <CatalogComposerPanel
          v-if="catalog"
          :catalog="catalog"
          :loading="loading"
          :root-exists="!!root"
          @preview="preview"
          @bootstrap="bootstrap"
        />
        <v-alert v-else type="info" variant="tonal">Catalog access is required before authoring or bootstrap is available.</v-alert>
      </UiParentCard>
    </v-col>
    <v-col cols="12" lg="6">
      <UiParentCard title="Server Preview">
        <PreviewDraftPanel :materialization="materialization" :root-etag="rootEtag" :loading="loading" @create-draft="createDraft" />
      </UiParentCard>
    </v-col>
    <v-col cols="12" lg="6">
      <UiParentCard title="Command Receipts">
        <v-alert type="info" variant="tonal" class="mb-3">
          Receipts are immutable command/replay results. Current projection is refreshed separately.
        </v-alert>
        <v-list v-if="receipts.length" data-test="command-receipts">
          <v-list-item v-for="receipt in receipts" :key="receipt.receiptId">
            <v-list-item-title v-if="receipt.outcome === 'FAILED'">
              Failed command: {{ receipt.failure?.toLowerCase() }}.
            </v-list-item-title>
            <v-list-item-title v-else-if="receipt.outcome === 'SUCCEEDED'">Succeeded command receipt.</v-list-item-title>
            <v-list-item-title v-else>Command pending.</v-list-item-title>
            <template #append>
              <v-btn
                v-if="receipt.outcome === 'FAILED'"
                data-test="retry-receipt"
                size="small"
                variant="outlined"
                @click="retryReceipt(receipt)"
                >Retry exact command</v-btn
              >
            </template>
          </v-list-item>
        </v-list>
        <v-alert v-else type="info" variant="tonal">No command receipts for this client.</v-alert>
      </UiParentCard>
    </v-col>
    <v-col cols="12" lg="6">
      <UiParentCard title="Root History">
        <RootHistoryPanel
          :root="root"
          :history="history"
          :authenticated-subject-id="user?.id ?? null"
          @review="versionAction($event, 'review')"
          @approve="versionAction($event, 'approval')"
          @discard="versionAction($event.versionId, 'discard', $event.reasonCategory)"
        />
      </UiParentCard>
    </v-col>
    <v-col cols="12" lg="6">
      <UiParentCard title="Clinic Exceptions">
        <ExceptionPanel
          :clinics="clinics"
          :base-versions="history?.versions ?? []"
          :optional-atom-keys="optionalAtomKeys"
          :context="exceptionContext"
          :history="exceptionHistory"
          :authenticated-subject-id="user?.id ?? null"
          @load-context="loadExceptionContext"
          @create="createException"
          @review="exceptionAction($event, 'review')"
          @approve="exceptionAction($event, 'approval')"
        />
      </UiParentCard>
    </v-col>
  </v-row>
</template>
