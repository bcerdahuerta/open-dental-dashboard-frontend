<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { PlusIcon, RefreshIcon } from 'vue-tabler-icons';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import WorkforceDrawer from '@/views/extraction/workforce/WorkforceDrawer.vue';
import WorkforceTable from '@/views/extraction/workforce/WorkforceTable.vue';
import { useExtractionStore } from '@/stores/extraction';
import { useClinicStore } from '@/stores/clinics';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

const extractionStore = useExtractionStore();
const clinicStore = useClinicStore();

const {
  encargados,
  encargadoAnalytics,
  loading,
  error,
  selectedEncargado,
  selectedEncargadoId,
  drawerOpen,
  drawerMode,
  analyticsLoadingById,
  reassignmentPendingById,
} = storeToRefs(extractionStore);
const { clinics } = storeToRefs(clinicStore);

const {
  hydrateLookups,
  fetchEncargados,
  createEncargado,
  updateEncargado,
  openCreateDrawer,
  openWorkforceMember,
  closeWorkforceDrawer,
  setDrawerMode,
  ensureWorkforceAnalytics,
  assignClinicsOptimistic,
} = extractionStore;

const pageMeta = ref({ title: 'Team Members' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Extraction', disabled: false, href: '/main/extraction' },
  { title: 'Team Members', disabled: true, href: '#' },
]);

const search = ref('');
const submitLoading = ref(false);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

const clinicItems = computed(() => {
  return clinics.value.map((clinic) => ({
    title: clinic.clinic_name,
    value: clinic.id,
  }));
});

const selectedAnalytics = computed(() => {
  if (!selectedEncargadoId.value) return null;
  return encargadoAnalytics.value[selectedEncargadoId.value] ?? null;
});

const selectedAnalyticsLoading = computed(() => {
  if (!selectedEncargadoId.value) return false;
  return analyticsLoadingById.value[selectedEncargadoId.value] ?? false;
});

const selectedReassignmentPending = computed(() => {
  if (!selectedEncargadoId.value) return false;
  return reassignmentPendingById.value[selectedEncargadoId.value] ?? false;
});

function showSnack(message: string, color: string) {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

function validateBasicFields(name: string, email: string): string | null {
  if (!name.trim()) return 'Name is required.';
  if (!email.trim()) return 'Email is required.';
  if (!email.includes('@')) return 'Email format looks invalid.';
  return null;
}

async function handleRefresh() {
  try {
    await fetchEncargados();
    showSnack('Team members refreshed.', 'success');
  } catch (err: unknown) {
    showSnack(getErrorMessage(err, 'Failed to refresh team members.'), 'error');
  }
}

async function handleCreate(payload: { name: string; email: string }) {
  const validationError = validateBasicFields(payload.name, payload.email);
  if (validationError) {
    showSnack(validationError, 'error');
    return;
  }

  submitLoading.value = true;
  try {
    const created = await createEncargado({
      name: payload.name.trim(),
      email: payload.email.trim(),
    });
    await openWorkforceMember(created.id, 'detail');
    showSnack('Team member created successfully.', 'success');
  } catch (err: unknown) {
    showSnack(getErrorMessage(err, 'Failed to create team member.'), 'error');
  } finally {
    submitLoading.value = false;
  }
}

async function handleEdit(payload: { name: string; email: string; is_active: boolean }) {
  if (!selectedEncargado.value) return;

  const validationError = validateBasicFields(payload.name, payload.email);
  if (validationError) {
    showSnack(validationError, 'error');
    return;
  }

  submitLoading.value = true;
  try {
    await updateEncargado(selectedEncargado.value.id, {
      name: payload.name.trim(),
      email: payload.email.trim(),
      is_active: payload.is_active,
    });
    setDrawerMode('detail');
    showSnack('Team member updated successfully.', 'success');
  } catch (err: unknown) {
    showSnack(getErrorMessage(err, 'Failed to update team member.'), 'error');
  } finally {
    submitLoading.value = false;
  }
}

async function handleAssignmentSave(clinicIds: string[]) {
  if (!selectedEncargado.value) return;

  try {
    await assignClinicsOptimistic(selectedEncargado.value.id, clinicIds);
    showSnack('Clinic assignments saved successfully.', 'success');
  } catch (err: unknown) {
    showSnack(getErrorMessage(err, 'Failed to save clinic assignments.'), 'error');
  }
}

async function handleOpenDetails(encargadoId: string) {
  await openWorkforceMember(encargadoId, 'detail');
}

async function handleEditRequest(encargadoId: string) {
  await openWorkforceMember(encargadoId, 'edit');
}

async function handleReassignRequest(encargadoId: string) {
  await openWorkforceMember(encargadoId, 'detail');
}

async function refreshSelectedAnalytics() {
  if (!selectedEncargadoId.value) return;

  try {
    await ensureWorkforceAnalytics(selectedEncargadoId.value, true);
    showSnack('Analytics refreshed.', 'success');
  } catch (err: unknown) {
    showSnack(getErrorMessage(err, 'Failed to refresh analytics.'), 'warning');
  }
}

function handleDrawerClose() {
  closeWorkforceDrawer();
}

onMounted(async () => {
  try {
    await hydrateLookups();
    await fetchEncargados();
  } catch (err: unknown) {
    showSnack(getErrorMessage(err, 'Failed to load workforce page.'), 'error');
  }
});
</script>

<template>
  <BaseBreadcrumb :title="pageMeta.title" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard title="Team Members">
        <template #action>
          <div class="d-flex align-center ga-2 flex-wrap">
            <v-text-field
              v-model="search"
              label="Search team members"
              color="primary"
              variant="outlined"
              hide-details="auto"
              density="compact"
              style="min-width: 240px"
            />
            <v-btn color="secondary" variant="tonal" size="small" @click="handleRefresh">
              <RefreshIcon size="16" class="mr-1" stroke-width="1.5" />
              Refresh
            </v-btn>
            <v-btn color="primary" variant="flat" size="small" @click="openCreateDrawer">
              <PlusIcon size="16" class="mr-1" stroke-width="1.5" />
              New Team Member
            </v-btn>
          </div>
        </template>

        <WorkforceTable
          :members="encargados"
          :loading="loading"
          :selected-id="selectedEncargadoId"
          :search="search"
          @open="handleOpenDetails"
          @edit="handleEditRequest"
          @reassign="handleReassignRequest"
        />
      </UiParentCard>
    </v-col>
  </v-row>

  <v-row v-if="error">
    <v-col cols="12">
      <v-alert type="error" variant="tonal" closable>
        {{ error }}
      </v-alert>
    </v-col>
  </v-row>

  <WorkforceDrawer
    v-model="drawerOpen"
    :mode="drawerMode"
    :member="selectedEncargado"
    :analytics="selectedAnalytics"
    :analytics-loading="selectedAnalyticsLoading"
    :submit-loading="submitLoading"
    :reassignment-pending="selectedReassignmentPending"
    :clinic-items="clinicItems"
    @close="handleDrawerClose"
    @submit-create="handleCreate"
    @submit-edit="handleEdit"
    @save-assignment="handleAssignmentSave"
    @refresh-analytics="refreshSelectedAnalytics"
  />

  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarText }}
  </v-snackbar>
</template>
