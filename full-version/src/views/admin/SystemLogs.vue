<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>

  <v-row>
    <v-col cols="12">
      <UiParentCard title="Execution Logs">
        <!-- Filters toolbar -->
        <div class="d-flex align-center ga-3 flex-wrap mb-4">
          <v-select
            v-model="filterClientId"
            :items="clients"
            item-title="client_name"
            item-value="id"
            label="Client"
            variant="outlined"
            color="primary"
            density="compact"
            hide-details="auto"
            clearable
            style="max-width: 200px"
            @update:model-value="onClientChange"
          />
          <v-select
            v-if="filterClientId"
            v-model="filterClinicId"
            :items="clinics"
            item-title="clinic_name"
            item-value="id"
            label="Clinic"
            variant="outlined"
            color="primary"
            density="compact"
            hide-details="auto"
            clearable
            style="max-width: 200px"
          />
          <v-select
            v-model="filterStatus"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            label="Status"
            variant="outlined"
            color="primary"
            density="compact"
            hide-details="auto"
            clearable
            style="max-width: 160px"
          />
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            @click="fetchLogs"
            :loading="loading"
          >
            <RefreshIcon size="16" class="mr-1" />
            Refresh
          </v-btn>
        </div>

        <!-- Logs table -->
        <v-data-table-server
          :headers="headers"
          :items="logs"
          :items-length="pagination.total"
          :items-per-page="itemsPerPage"
          :page="currentPage"
          :loading="loading"
          item-value="execution_id"
          hover
          @update:options="onPageUpdate"
          @click:row="toggleRow"
        >
          <!-- Started At -->
          <template #item.started_at="{ item }">
            <span class="text-body-2 text-medium-emphasis">
              {{ formatDate(item.started_at) }}
            </span>
          </template>

          <!-- Clinic Name -->
          <template #item.clinic_name="{ item }">
            <span class="text-body-2 font-weight-medium">
              {{ item.clinic_name || '—' }}
            </span>
          </template>

          <!-- Status chip -->
          <template #item.status="{ item }">
            <v-chip
              :color="statusColor(item.status)"
              variant="tonal"
              size="small"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <!-- Step Count -->
          <template #item.step_count="{ item }">
            <span class="text-body-2">{{ item.step_count }}</span>
          </template>

          <!-- Duration -->
          <template #item.duration="{ item }">
            <span class="text-body-2">{{ formatDuration(item) }}</span>
          </template>

          <!-- Error Summary -->
          <template #item.error_summary="{ item }">
            <v-tooltip v-if="item.error_summary" location="top" max-width="400">
              <template v-slot:activator="{ props }">
                <span
                  v-bind="props"
                  class="text-body-2 text-error text-truncate d-inline-block"
                  style="max-width: 200px"
                >
                  {{ item.error_summary }}
                </span>
              </template>
              <span>{{ item.error_summary }}</span>
            </v-tooltip>
            <span v-else class="text-body-2 text-medium-emphasis">—</span>
          </template>

          <!-- Expanded row: step logs -->
          <template #expanded-row="{ item }">
            <td :colspan="headers.length" class="pa-4 bg-grey-lighten-5">
              <div v-if="item.step_logs && item.step_logs.length > 0">
                <h6 class="text-subtitle-2 font-weight-bold mb-2">Pipeline Steps</h6>
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    v-for="(step, idx) in item.step_logs"
                    :key="idx"
                    class="px-0"
                  >
                    <div class="d-flex align-center ga-3">
                      <v-chip
                        :color="stepStatusColor(step.status)"
                        variant="tonal"
                        size="x-small"
                        style="min-width: 70px"
                      >
                        {{ step.status }}
                      </v-chip>
                      <span class="text-body-2 font-weight-medium">{{ step.step_type }}</span>
                      <span class="text-caption text-medium-emphasis">
                        {{ step.duration_ms != null ? `${step.duration_ms}ms` : '—' }}
                      </span>
                      <span v-if="step.error_message" class="text-caption text-error">
                        {{ step.error_message }}
                      </span>
                    </div>
                  </v-list-item>
                </v-list>
              </div>
              <div v-else class="text-caption text-medium-emphasis">No step logs recorded.</div>
            </td>
          </template>
        </v-data-table-server>
      </UiParentCard>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { RefreshIcon } from 'vue-tabler-icons';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useClientStore } from '@/stores/clients';
import { useClinicStore } from '@/stores/clinics';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const page = ref({ title: 'System Logs' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '#' },
  { title: 'System Logs', disabled: true, href: '#' }
]);

const clientStore = useClientStore();
const clinicStore = useClinicStore();
const { clients } = storeToRefs(clientStore);
const { clinics } = storeToRefs(clinicStore);

const baseUrl = `${import.meta.env.VITE_API_URL}/logs`;

// State
const logs = ref<any[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(50);
const pagination = ref({ total: 0, pages: 0 });
const expandedRows = ref<string[]>([]);

// Filters
const filterClientId = ref<string | undefined>(undefined);
const filterClinicId = ref<string | undefined>(undefined);
const filterStatus = ref<string | undefined>(undefined);

const statusOptions = [
  { title: 'All', value: undefined },
  { title: 'Running', value: 'RUNNING' },
  { title: 'Success', value: 'SUCCESS' },
  { title: 'Partial', value: 'PARTIAL' },
  { title: 'Failed', value: 'FAILED' },
];

const headers = [
  { title: 'Started', key: 'started_at', sortable: false, width: '180px' },
  { title: 'Clinic', key: 'clinic_name', sortable: false },
  { title: 'Status', key: 'status', sortable: false, width: '120px' },
  { title: 'Steps', key: 'step_count', sortable: false, width: '80px' },
  { title: 'Duration', key: 'duration', sortable: false, width: '110px' },
  { title: 'Error', key: 'error_summary', sortable: false },
];

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    RUNNING: 'primary',
    SUCCESS: 'success',
    PARTIAL: 'warning',
    FAILED: 'error',
  };
  return colors[status] || 'grey';
}

function stepStatusColor(status: string): string {
  const colors: Record<string, string> = {
    SUCCESS: 'success',
    FAILED: 'error',
    SKIPPED: 'grey',
  };
  return colors[status] || 'grey';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function formatDuration(item: any): string {
  if (!item.started_at) return '—';
  const start = new Date(item.started_at);
  const end = item.completed_at ? new Date(item.completed_at) : new Date();
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function fetchLogs() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', String(currentPage.value));
    params.set('per_page', String(itemsPerPage.value));
    if (filterClinicId.value) params.set('clinic_id', filterClinicId.value);
    if (filterStatus.value) params.set('status', filterStatus.value);

    const data = await fetchWrapper.get(`${baseUrl}?${params.toString()}`);
    logs.value = data.items || [];
    pagination.value = {
      total: data.total || 0,
      pages: data.pages || 0,
    };
  } catch (err: any) {
    logs.value = [];
  } finally {
    loading.value = false;
  }
}

function toggleRow(_event: Event, row: { item: any }) {
  const id = row.item.execution_id;
  const idx = expandedRows.value.indexOf(id);
  if (idx >= 0) {
    expandedRows.value.splice(idx, 1);
  } else {
    expandedRows.value.push(id);
  }
}

function onPageUpdate(options: { page: number; itemsPerPage: number }) {
  currentPage.value = options.page;
  itemsPerPage.value = options.itemsPerPage;
  fetchLogs();
}

async function onClientChange(clientId: string | undefined) {
  filterClinicId.value = undefined;
  if (clientId) {
    await clinicStore.fetchClinics(clientId);
  }
}

// Reload when filters change
watch([filterStatus, filterClinicId], () => {
  currentPage.value = 1;
  fetchLogs();
});

onMounted(() => {
  fetchLogs();
  clientStore.fetchClients();
});
</script>
