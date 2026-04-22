<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useExtractionStore } from '@/stores/extraction';
import { useClinicStore } from '@/stores/clinics';
import { useClientStore } from '@/stores/clients';
import { PlusIcon, PencilIcon, RefreshIcon, UsersIcon } from 'vue-tabler-icons';
import type { Encargado, EncargadoAssignmentScope } from '@/types/extraction';

const extractionStore = useExtractionStore();
const clinicStore = useClinicStore();
const clientStore = useClientStore();

const { encargados, encargadoAnalytics, loading, error } = storeToRefs(extractionStore);
const { clinics } = storeToRefs(clinicStore);
const { clients } = storeToRefs(clientStore);
const { fetchEncargados, createEncargado, updateEncargado, assignClinics, fetchAnalytics } = extractionStore;
const { fetchClinicCatalog } = clinicStore;
const { fetchClients } = clientStore;

const pageMeta = ref({ title: 'Team Members' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Extraction', disabled: false, href: '/main/extraction' },
  { title: 'Team Members', disabled: true, href: '#' },
]);

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Status', key: 'is_active', sortable: false },
  { title: 'Clinics', key: 'clinic_count', align: 'end' as const, sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
];

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

const expanded = ref<string[]>([]);
const analyticsLoadingIds = ref<string[]>([]);

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const showAssignDialog = ref(false);

const submitLoading = ref(false);

const selectedEncargado = ref<Encargado | null>(null);

const createForm = ref({
  name: '',
  email: '',
});

const editForm = ref({
  name: '',
  email: '',
  is_active: true,
});

const assignForm = ref<{ clinic_ids: string[]; legacy_client_ids: string[] }>({
  clinic_ids: [],
  legacy_client_ids: [],
});

const clinicItems = computed(() => {
  return (clinics.value || []).map((clinic) => ({
    title: clinic.clinic_name,
    value: clinic.id,
  }));
});

const clientItems = computed(() => {
  return (clients.value || []).map((client) => ({
    title: client.client_name,
    value: client.id,
  }));
});

const clinicNameMap = computed<Record<string, string>>(() => {
  return (clinics.value || []).reduce((acc, clinic) => {
    acc[clinic.id] = clinic.clinic_name;
    return acc;
  }, {} as Record<string, string>);
});

const clientNameMap = computed<Record<string, string>>(() => {
  return (clients.value || []).reduce((acc, client) => {
    acc[client.id] = client.client_name;
    return acc;
  }, {} as Record<string, string>);
});

function showSnack(message: string, color: string) {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

function statusColor(isActive: boolean): string {
  return isActive ? 'success' : 'grey';
}

function clinicCount(item: Encargado): number {
  return Array.isArray(item.clinic_ids) ? item.clinic_ids.length : 0;
}

function assignedClinicNames(item: Encargado): string[] {
  return (item.clinic_ids || []).map((id) => clinicNameMap.value[id] || id.slice(0, 8));
}

function assignedClientNames(item: Encargado): string[] {
  return (item.client_ids || []).map((id) => clientNameMap.value[id] || id.slice(0, 8));
}

function resolvedScopeLabel(scope?: EncargadoAssignmentScope): string {
  if (scope === 'clinic') return 'Clinic-first';
  if (scope === 'client') return 'Legacy fallback';
  return 'Unassigned';
}

function resolvedScopeColor(scope?: EncargadoAssignmentScope): string {
  if (scope === 'clinic') return 'success';
  if (scope === 'client') return 'warning';
  return 'grey';
}

function resetCreateForm() {
  createForm.value = { name: '', email: '' };
}

function resetEditForm() {
  editForm.value = { name: '', email: '', is_active: true };
}

function resetAssignForm() {
  assignForm.value = { clinic_ids: [], legacy_client_ids: [] };
}

function validateBasicFields(name: string, email: string): string | null {
  if (!name.trim()) return 'Name is required.';
  if (!email.trim()) return 'Email is required.';
  if (!email.includes('@')) return 'Email format looks invalid.';
  return null;
}

function openCreateDialog() {
  resetCreateForm();
  showCreateDialog.value = true;
}

function openEditDialog(item: Encargado) {
  selectedEncargado.value = item;
  editForm.value = {
    name: item.name,
    email: item.email,
    is_active: item.is_active,
  };
  showEditDialog.value = true;
}

function openAssignDialog(item: Encargado) {
  selectedEncargado.value = item;
  assignForm.value = {
    clinic_ids: [...(item.clinic_ids || [])],
    legacy_client_ids: [...(item.client_ids || [])],
  };
  showAssignDialog.value = true;
}

function closeCreateDialog() {
  showCreateDialog.value = false;
}

function closeEditDialog() {
  showEditDialog.value = false;
  selectedEncargado.value = null;
}

function closeAssignDialog() {
  showAssignDialog.value = false;
  selectedEncargado.value = null;
}

async function refreshEncargados() {
  try {
    await fetchEncargados();
  } catch (err: any) {
    showSnack(err?.message || 'Failed to refresh team members', 'error');
  }
}

async function submitCreate() {
  if (submitLoading.value) return;

  const validationError = validateBasicFields(createForm.value.name, createForm.value.email);
  if (validationError) {
    showSnack(validationError, 'error');
    return;
  }

  submitLoading.value = true;
  try {
    await createEncargado({
      name: createForm.value.name.trim(),
      email: createForm.value.email.trim(),
    });
    closeCreateDialog();
    showSnack('Team member created successfully.', 'success');
  } catch (err: any) {
    showSnack(err?.message || 'Failed to create team member', 'error');
  } finally {
    submitLoading.value = false;
  }
}

async function submitEdit() {
  if (!selectedEncargado.value || submitLoading.value) return;

  const validationError = validateBasicFields(editForm.value.name, editForm.value.email);
  if (validationError) {
    showSnack(validationError, 'error');
    return;
  }

  submitLoading.value = true;
  try {
    await updateEncargado(selectedEncargado.value.id, {
      name: editForm.value.name.trim(),
      email: editForm.value.email.trim(),
      is_active: Boolean(editForm.value.is_active),
    });
    closeEditDialog();
    showSnack('Team member updated successfully.', 'success');
  } catch (err: any) {
    showSnack(err?.message || 'Failed to update team member', 'error');
  } finally {
    submitLoading.value = false;
  }
}

async function submitAssign() {
  if (!selectedEncargado.value || submitLoading.value) return;

  submitLoading.value = true;
  try {
    await assignClinics(selectedEncargado.value.id, assignForm.value.clinic_ids);
    closeAssignDialog();
    showSnack('Clinic assignments saved successfully.', 'success');
  } catch (err: any) {
    showSnack(err?.message || 'Failed to assign clinics', 'error');
  } finally {
    submitLoading.value = false;
  }
}

async function ensureAnalytics(encargadoId: string) {
  if (encargadoAnalytics.value[encargadoId]) return;
  if (analyticsLoadingIds.value.includes(encargadoId)) return;

  analyticsLoadingIds.value.push(encargadoId);
  try {
    await fetchAnalytics(encargadoId);
  } catch {
    showSnack('Unable to load analytics right now. Showing placeholder metrics.', 'warning');
  } finally {
    analyticsLoadingIds.value = analyticsLoadingIds.value.filter((id) => id !== encargadoId);
  }
}

watch(expanded, async (newExpanded, oldExpanded) => {
  const oldValues = oldExpanded || [];
  const newlyOpened = (newExpanded || []).filter((id) => !oldValues.includes(id));
  await Promise.all(newlyOpened.map((id) => ensureAnalytics(id)));
});

onMounted(async () => {
  try {
    await Promise.all([
      fetchClinicCatalog({ limit: 500, includeInactive: true }),
      fetchClients({ limit: 500, includeInactive: true }),
      fetchEncargados(),
    ]);
  } catch (err: any) {
    showSnack(err?.message || String(err), 'error');
  }
});
</script>

<template>
  <BaseBreadcrumb :title="pageMeta.title" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard title="Team Members">
        <div class="d-flex align-center mb-4 ga-2">
          <v-btn color="secondary" variant="tonal" size="small" @click="refreshEncargados">
            <RefreshIcon size="18" class="mr-1" stroke-width="1.5" />
            Refresh
          </v-btn>

          <v-spacer />

          <v-btn color="primary" variant="flat" size="small" @click="openCreateDialog">
            <PlusIcon size="18" class="mr-1" stroke-width="1.5" />
            New Team Member
          </v-btn>
        </div>

        <v-data-table
          v-model:expanded="expanded"
          :headers="headers"
          :items="encargados"
          :loading="loading"
          item-value="id"
          show-expand
          hover
        >
          <template #item.name="{ item }">
            <div class="d-flex align-center ga-2 flex-wrap">
              <span class="font-weight-medium">{{ item.name }}</span>
              <v-chip size="x-small" variant="tonal" :color="resolvedScopeColor(item.resolved_assignment_scope)">
                {{ resolvedScopeLabel(item.resolved_assignment_scope) }}
              </v-chip>
            </div>
          </template>

          <template #item.is_active="{ item }">
            <v-chip size="small" :color="statusColor(item.is_active)" variant="tonal">
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>

          <template #item.clinic_count="{ item }">
            <span class="font-weight-medium">{{ clinicCount(item) }}</span>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex align-center justify-center ga-1">
              <v-btn icon variant="text" size="small" @click="openAssignDialog(item)">
                <UsersIcon size="16" stroke-width="1.5" />
              </v-btn>
              <v-btn icon variant="text" size="small" @click="openEditDialog(item)">
                <PencilIcon size="16" stroke-width="1.5" />
              </v-btn>
            </div>
          </template>

          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="bg-containerBg pa-4">
                <v-row>
                  <v-col cols="12" md="4">
                    <div class="text-caption text-medium-emphasis mb-1">Assigned Clinics</div>
                    <div class="d-flex ga-1 flex-wrap">
                      <v-chip
                        v-for="name in assignedClinicNames(item)"
                        :key="name"
                        size="x-small"
                        variant="tonal"
                        color="primary"
                      >
                        {{ name }}
                      </v-chip>
                      <span v-if="!assignedClinicNames(item).length" class="text-medium-emphasis">No clinics assigned.</span>
                    </div>
                  </v-col>

                  <v-col cols="12" md="4">
                    <div class="text-caption text-medium-emphasis mb-1">Legacy Fallback (Clients)</div>
                    <div class="d-flex ga-1 flex-wrap">
                      <v-chip
                        v-for="name in assignedClientNames(item)"
                        :key="`legacy-${name}`"
                        size="x-small"
                        variant="outlined"
                        color="warning"
                      >
                        {{ name }}
                      </v-chip>
                      <span v-if="!assignedClientNames(item).length" class="text-medium-emphasis">No legacy fallback clients.</span>
                    </div>
                  </v-col>

                  <v-col cols="12" md="4">
                    <div class="text-caption text-medium-emphasis mb-2">Analytics (stub)</div>
                    <v-row>
                      <v-col cols="12">
                        <v-sheet border rounded class="pa-3">
                          <div class="text-caption text-medium-emphasis">Resolved Client Count</div>
                          <div class="text-h6">
                            {{ encargadoAnalytics[item.id]?.client_count ?? item.resolved_assignment_client_ids?.length ?? 0 }}
                          </div>
                        </v-sheet>
                      </v-col>
                      <v-col cols="12">
                        <v-sheet border rounded class="pa-3">
                          <div class="text-caption text-medium-emphasis">Resolved Clinic Count</div>
                          <div class="text-h6">
                            {{ encargadoAnalytics[item.id]?.clinic_count ?? item.resolved_assignment_clinic_ids?.length ?? clinicCount(item) }}
                          </div>
                        </v-sheet>
                      </v-col>
                      <v-col cols="12">
                        <v-sheet border rounded class="pa-3">
                          <div class="text-caption text-medium-emphasis">Resolved Scope</div>
                          <div class="text-h6">
                            {{ resolvedScopeLabel(item.resolved_assignment_scope) }}
                          </div>
                        </v-sheet>
                      </v-col>
                    </v-row>
                  </v-col>
                </v-row>
              </td>
            </tr>
          </template>

          <template #no-data>
            <div class="text-center pa-8 text-medium-emphasis">
              No team members found. Create one to start assigning clinics.
            </div>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <v-dialog v-model="showCreateDialog" max-width="560">
    <v-card>
      <v-card-title class="text-h6">Create Team Member</v-card-title>
      <v-card-text>
        <v-form>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="createForm.name"
                label="Name"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="createForm.email"
                label="Email"
                type="email"
                variant="outlined"
                hide-details
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeCreateDialog">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="submitLoading" @click="submitCreate">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showEditDialog" max-width="620">
    <v-card>
      <v-card-title class="text-h6">Edit Team Member</v-card-title>
      <v-card-text>
        <v-form>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="editForm.name"
                label="Name"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="editForm.email"
                label="Email"
                type="email"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-switch
                v-model="editForm.is_active"
                label="Active"
                color="success"
                hide-details
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeEditDialog">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="submitLoading" @click="submitEdit">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showAssignDialog" max-width="680">
    <v-card>
      <v-card-title class="text-h6">
        Clinic Assignments
      </v-card-title>
      <v-card-text>
        <v-form>
          <v-row>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis mb-2">
                Clinics are source of truth. Legacy client assignments remain visible as fallback only.
              </div>
              <div class="text-caption text-medium-emphasis mb-1">Clinics</div>
              <v-select
                v-model="assignForm.clinic_ids"
                :items="clinicItems"
                item-title="title"
                item-value="value"
                label="Clinics"
                variant="outlined"
                multiple
                chips
                closable-chips
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-medium-emphasis mb-1">Legacy Fallback (Clients)</div>
              <v-select
                v-model="assignForm.legacy_client_ids"
                :items="clientItems"
                item-title="title"
                item-value="value"
                label="Legacy Fallback (Clients)"
                variant="outlined"
                multiple
                chips
                disabled
                hide-details
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeAssignDialog">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="submitLoading" @click="submitAssign">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-row v-if="error">
    <v-col cols="12">
      <v-alert type="error" variant="tonal" closable>
        {{ error }}
      </v-alert>
    </v-col>
  </v-row>

  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarText }}
  </v-snackbar>
</template>
