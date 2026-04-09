<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useExtractionStore } from '@/stores/extraction';
import { useClientStore } from '@/stores/clients';
import { PlusIcon, PencilIcon, RefreshIcon, UsersIcon } from 'vue-tabler-icons';
import type { Encargado } from '@/types/extraction';

const extractionStore = useExtractionStore();
const clientStore = useClientStore();

const { encargados, encargadoAnalytics, loading, error } = storeToRefs(extractionStore);
const { clients } = storeToRefs(clientStore);
const { fetchEncargados, createEncargado, updateEncargado, assignClients, fetchAnalytics } = extractionStore;
const { fetchClients } = clientStore;

const pageMeta = ref({ title: 'Encargados' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Extraction', disabled: false, href: '/main/extraction' },
  { title: 'Encargados', disabled: true, href: '#' },
]);

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Email', key: 'email', sortable: false },
  { title: 'Status', key: 'is_active', sortable: false },
  { title: 'Clients', key: 'client_count', align: 'end' as const, sortable: false },
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

const assignForm = ref<{ client_ids: string[] }>({
  client_ids: [],
});

const clientItems = computed(() => {
  return (clients.value || []).map((client) => ({
    title: client.client_name,
    value: client.id,
  }));
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

function clientCount(item: Encargado): number {
  return Array.isArray(item.client_ids) ? item.client_ids.length : 0;
}

function assignedClientNames(item: Encargado): string[] {
  return (item.client_ids || []).map((id) => clientNameMap.value[id] || id.slice(0, 8));
}

function resetCreateForm() {
  createForm.value = { name: '', email: '' };
}

function resetEditForm() {
  editForm.value = { name: '', email: '', is_active: true };
}

function resetAssignForm() {
  assignForm.value = { client_ids: [] };
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
    client_ids: [...(item.client_ids || [])],
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
    showSnack(err?.message || 'Failed to refresh encargados', 'error');
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
    showSnack('Encargado created successfully.', 'success');
  } catch (err: any) {
    showSnack(err?.message || 'Failed to create encargado', 'error');
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
    showSnack('Encargado updated successfully.', 'success');
  } catch (err: any) {
    showSnack(err?.message || 'Failed to update encargado', 'error');
  } finally {
    submitLoading.value = false;
  }
}

async function submitAssign() {
  if (!selectedEncargado.value || submitLoading.value) return;

  submitLoading.value = true;
  try {
    await assignClients(selectedEncargado.value.id, assignForm.value.client_ids);
    closeAssignDialog();
    showSnack('Client assignments saved successfully.', 'success');
  } catch (err: any) {
    showSnack(err?.message || 'Failed to assign clients', 'error');
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
    await fetchClients({ limit: 500, includeInactive: true });
    await fetchEncargados();
  } catch (err: any) {
    showSnack(err?.message || String(err), 'error');
  }
});
</script>

<template>
  <BaseBreadcrumb :title="pageMeta.title" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard title="Encargados">
        <div class="d-flex align-center mb-4 ga-2">
          <v-btn color="secondary" variant="tonal" size="small" @click="refreshEncargados">
            <RefreshIcon size="18" class="mr-1" stroke-width="1.5" />
            Refresh
          </v-btn>

          <v-spacer />

          <v-btn color="primary" variant="flat" size="small" @click="openCreateDialog">
            <PlusIcon size="18" class="mr-1" stroke-width="1.5" />
            New Encargado
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
          <template #item.is_active="{ item }">
            <v-chip size="small" :color="statusColor(item.is_active)" variant="tonal">
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>

          <template #item.client_count="{ item }">
            <span class="font-weight-medium">{{ clientCount(item) }}</span>
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
                    <div class="text-caption text-medium-emphasis mb-1">Assigned Clients</div>
                    <div class="d-flex ga-1 flex-wrap">
                      <v-chip
                        v-for="name in assignedClientNames(item)"
                        :key="name"
                        size="x-small"
                        variant="tonal"
                        color="primary"
                      >
                        {{ name }}
                      </v-chip>
                      <span v-if="!assignedClientNames(item).length" class="text-medium-emphasis">No clients assigned.</span>
                    </div>
                  </v-col>

                  <v-col cols="12" md="8">
                    <div class="text-caption text-medium-emphasis mb-2">Analytics (stub)</div>
                    <v-row>
                      <v-col cols="12" sm="4">
                        <v-sheet border rounded class="pa-3">
                          <div class="text-caption text-medium-emphasis">Client Count</div>
                          <div class="text-h6">
                            {{ encargadoAnalytics[item.id]?.client_count ?? clientCount(item) }}
                          </div>
                        </v-sheet>
                      </v-col>
                      <v-col cols="12" sm="4">
                        <v-sheet border rounded class="pa-3">
                          <div class="text-caption text-medium-emphasis">Verification Volume</div>
                          <div class="text-h6">
                            {{ encargadoAnalytics[item.id]?.verification_volume ?? '—' }}
                          </div>
                        </v-sheet>
                      </v-col>
                      <v-col cols="12" sm="4">
                        <v-sheet border rounded class="pa-3">
                          <div class="text-caption text-medium-emphasis">Completion Rate</div>
                          <div class="text-h6">
                            {{ encargadoAnalytics[item.id]?.completion_rate ?? '—' }}
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
              No encargados found. Create one to start assigning clients.
            </div>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <v-dialog v-model="showCreateDialog" max-width="560">
    <v-card>
      <v-card-title class="text-h6">Create Encargado</v-card-title>
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
      <v-card-title class="text-h6">Edit Encargado</v-card-title>
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
        Assign Clients
      </v-card-title>
      <v-card-text>
        <v-form>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="assignForm.client_ids"
                :items="clientItems"
                item-title="title"
                item-value="value"
                label="Clients"
                variant="outlined"
                multiple
                chips
                closable-chips
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
