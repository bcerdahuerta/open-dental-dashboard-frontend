<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import {
  RefreshIcon,
  PlayerPlayIcon,
  EyeIcon,
} from 'vue-tabler-icons';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import JobDetailDrawer from '@/components/writeback/JobDetailDrawer.vue';
import { useWritebackStore } from '@/stores/writeback';
import { useClientStore } from '@/stores/clients';
import { useClinicStore } from '@/stores/clinics';
import { getWritebackStatusPresentation } from '@/utils/writebackStatus';
import type { WritebackJob, JobStatus } from '@/types/writeback';

const writebackStore = useWritebackStore();
const clientStore = useClientStore();
const clinicStore = useClinicStore();
const route = useRoute();
const router = useRouter();

const { jobs, loading, error, jobsPagination } = storeToRefs(writebackStore);
const { clients } = storeToRefs(clientStore);
const { clinics } = storeToRefs(clinicStore);

// Filters
const filterStatus = ref<string | undefined>(undefined);
const filterClientId = ref<string | undefined>(undefined);
const filterClinicId = ref<string | undefined>(undefined);

// Auto-refresh
const autoRefresh = ref(true);
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// Drawer
const drawerOpen = ref(false);
const selectedJobId = ref<string | null>(null);

function normalizeJobId(value: unknown): string | null {
  if (Array.isArray(value)) {
    return normalizeJobId(value[0]);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function syncJobIdQuery(jobId: string | null): void {
  const currentJobId = normalizeJobId(route.query.jobId);
  if (currentJobId === jobId) {
    return;
  }

  const nextQuery = { ...route.query };

  if (jobId) {
    nextQuery.jobId = jobId;
  } else {
    delete nextQuery.jobId;
  }

  router.replace({ query: nextQuery });
}

// Server-side pagination options
const itemsPerPage = ref(50);
const currentPage = ref(1);

// Status filter options
const statusOptions = [
  { title: 'All Statuses', value: undefined },
  { title: 'Pending', value: 'PENDING' },
  { title: 'Polling', value: 'POLLING' },
  { title: 'Extracting', value: 'EXTRACTING' },
  { title: 'Executing', value: 'EXECUTING' },
  { title: 'Extracted', value: 'EXTRACTED' },
  { title: 'Executed', value: 'EXECUTED' },
  { title: 'Partial', value: 'PARTIAL' },
  { title: 'No Appointment', value: 'NO_APPOINTMENT' },
  { title: 'Retry deferred', value: 'RETRY_DEFERRED' },
  { title: 'Blocked: eConnector', value: 'BLOCKED_ECONNECTOR' },
  { title: 'Retrying Sheets', value: 'SHEETS_RETRYING' },
  { title: 'Syncing', value: 'SYNCING' },
  { title: 'Synced', value: 'SYNCED' },
  { title: 'Done', value: 'DONE' },
  { title: 'Failed', value: 'FAILED' },
  { title: 'Extract Failed', value: 'EXTRACT_FAILED' },
  { title: 'Sync Failed', value: 'SYNC_FAILED' },
];

// Table headers
const headers = [
  { title: 'Patient', key: 'patient_name', sortable: false },
  { title: 'Clinic', key: 'clinic_name', sortable: false, width: '160px' },
  { title: 'Row #', key: 'row_index', sortable: false, width: '70px' },
  { title: 'Appt Date', key: 'sheet_tab', sortable: false, width: '120px' },
  { title: 'Profile', key: 'matched_profile', sortable: false, width: '180px' },
  { title: 'Status', key: 'status', sortable: false, width: '130px' },
  { title: 'Attempt', key: 'attempt', sortable: false, width: '90px' },
  { title: 'Created', key: 'created_at', sortable: false, width: '180px' },
  { title: 'Duration', key: 'duration', sortable: false, width: '110px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
];

function statusColor(status: string): string {
  return getWritebackStatusPresentation(status).color;
}

function statusLabel(status: string): string {
  return getWritebackStatusPresentation(status).label;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

const terminalStatuses = new Set<JobStatus>([
  'DONE',
  'SYNCED',
  'FAILED',
  'PARTIAL',
  'NO_APPOINTMENT',
  'EXTRACT_FAILED',
  'SYNC_FAILED',
]);

const retryableStatuses = new Set<JobStatus>([
  'FAILED',
  'PARTIAL',
  'EXTRACT_FAILED',
  'SYNC_FAILED',
]);

function canRetry(job: WritebackJob): boolean {
  if (!retryableStatuses.has(job.status)) {
    return false;
  }
  // `retryable=false` blocks automatic retries, not operator-initiated retries
  // after source-file remediation.
  if (job.error_category === 'source_file_invalid') {
    return true;
  }
  return job.retryable !== false;
}

function retryButtonLabel(job: WritebackJob): string {
  return job.error_category === 'source_file_invalid' ? 'Retry after fix' : 'Retry';
}

function formatDuration(job: WritebackJob): string {
  if (!job.started_at) return '—';
  const start = new Date(job.started_at);
  const end = job.completed_at
    ? new Date(job.completed_at)
    : terminalStatuses.has(job.status)
      ? start
      : new Date();
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function loadJobs() {
  await writebackStore.fetchJobs({
    page: currentPage.value,
    per_page: itemsPerPage.value,
    client_id: filterClientId.value,
    clinic_id: filterClinicId.value,
    status: filterStatus.value,
  });
}

function handleInspect(jobId: string) {
  const normalizedJobId = normalizeJobId(jobId);
  if (!normalizedJobId) {
    return;
  }

  selectedJobId.value = normalizedJobId;
  drawerOpen.value = true;
}

watch(
  () => normalizeJobId(route.query.jobId),
  (jobId) => {
    if (!jobId) {
      drawerOpen.value = false;
      selectedJobId.value = null;
      return;
    }

    selectedJobId.value = jobId;
    drawerOpen.value = true;
  },
  { immediate: true }
);

watch([drawerOpen, selectedJobId], ([isOpen, jobId]) => {
  if (isOpen && jobId) {
    syncJobIdQuery(jobId);
    return;
  }

  if (!isOpen) {
    syncJobIdQuery(null);
    selectedJobId.value = null;
  }
});

async function handleRetry(jobId: string) {
  await writebackStore.retryJob(jobId);
  await loadJobs();
}

async function handleExecute(jobId: string) {
  try {
    await writebackStore.executeJob(jobId);
    snackbarMsg.value = 'Job dispatched for execution';
    snackbarColor.value = 'success';
    snackbar.value = true;
  } catch (err: unknown) {
    snackbarMsg.value = err instanceof Error ? err.message : 'Execute failed';
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

// Snackbar state
const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');

function onPageUpdate(options: { page: number; itemsPerPage: number }) {
  currentPage.value = options.page;
  itemsPerPage.value = options.itemsPerPage;
  loadJobs();
}

// Cascading client → clinic filter
watch(filterClientId, async (clientId) => {
  filterClinicId.value = undefined;
  if (clientId) {
    await clinicStore.fetchClinics(clientId);
  }
  // loadJobs will be called by the combined watch below
});

// Reload when any filter changes
watch([filterStatus, filterClientId, filterClinicId], () => {
  currentPage.value = 1;
  loadJobs();
});

// Auto-refresh toggle
watch(autoRefresh, (enabled) => {
  if (enabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

function startAutoRefresh() {
  stopAutoRefresh();
  refreshInterval = setInterval(() => {
    loadJobs();
  }, 10000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

onMounted(() => {
  loadJobs();
  clientStore.fetchClients();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Live Activity">
        <!-- Filters toolbar -->
        <div class="d-flex align-center ga-3 flex-wrap mb-4">
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
            style="max-width: 180px"
          />
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

          <v-spacer />

          <v-switch
            v-model="autoRefresh"
            label="Auto-refresh"
            color="primary"
            density="compact"
            hide-details
            class="flex-grow-0"
          />
        </div>

        <!-- Error alert -->
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          density="compact"
          closable
          class="mb-4"
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <!-- Jobs table with server-side pagination -->
        <v-data-table-server
          :headers="headers"
          :items="jobs"
          :items-length="jobsPagination.total"
          :items-per-page="itemsPerPage"
          :page="currentPage"
          :loading="loading"
          item-value="id"
          hover
          @update:options="onPageUpdate"
        >
          <!-- Patient name -->
          <template #[`item.patient_name`]="{ item }">
            <span class="text-body-2 font-weight-medium">
              {{ item.patient_name || 'N/A' }}
            </span>
          </template>

          <!-- Clinic name -->
          <template #[`item.clinic_name`]="{ item }">
            <span class="text-body-2 text-medium-emphasis">
              {{ item.clinic_name || '—' }}
            </span>
          </template>

          <!-- Row index -->
          <template #[`item.row_index`]="{ item }">
            <span class="text-body-2 text-medium-emphasis">{{ item.row_index }}</span>
          </template>

          <!-- Sheet tab / appointment date -->
          <template #[`item.sheet_tab`]="{ item }">
            <span class="text-body-2">{{ item.sheet_tab || '—' }}</span>
          </template>

          <!-- Matched profile chip -->
          <template #[`item.matched_profile`]="{ item }">
            <v-chip
              v-if="item.matched_profile"
              :color="item.matched_profile === 'No match' ? 'error' : 'success'"
              variant="tonal"
              size="x-small"
            >
              {{ item.matched_profile }}
            </v-chip>
            <span v-else class="text-caption text-medium-emphasis">—</span>
          </template>

          <!-- Status chip -->
          <template #[`item.status`]="{ item }">
            <div class="d-flex flex-column ga-1">
              <v-chip
                :color="statusColor(item.status)"
                variant="tonal"
                size="small"
              >
                {{ statusLabel(item.status) }}
              </v-chip>
              <v-chip
                v-if="item.error_category === 'source_file_invalid'"
                color="warning"
                variant="tonal"
                size="x-small"
              >
                Source file invalid
              </v-chip>
            </div>
          </template>

          <!-- Attempt -->
          <template #[`item.attempt`]="{ item }">
            <span class="text-body-2">
              {{ item.attempt }}/{{ item.max_attempts }}
            </span>
          </template>

          <!-- Created date -->
          <template #[`item.created_at`]="{ item }">
            <span class="text-body-2 text-medium-emphasis">
              {{ formatDate(item.created_at) }}
            </span>
          </template>

          <!-- Duration -->
          <template #[`item.duration`]="{ item }">
            <span class="text-body-2">{{ formatDuration(item) }}</span>
          </template>

          <!-- Actions -->
          <template #[`item.actions`]="{ item }">
            <v-btn
              color="info"
              variant="tonal"
              size="x-small"
              @click.stop="handleInspect(item.id)"
              class="mr-1"
            >
              <EyeIcon size="14" class="mr-1" />
              View
            </v-btn>
            <v-btn
              v-if="item.status === 'PENDING'"
              color="primary"
              variant="tonal"
              size="x-small"
              @click.stop="handleExecute(item.id)"
              class="mr-1"
            >
              <PlayerPlayIcon size="14" class="mr-1" />
              Execute
            </v-btn>
            <v-btn
              v-if="canRetry(item)"
              color="warning"
              variant="tonal"
              size="x-small"
              @click.stop="handleRetry(item.id)"
            >
              <RefreshIcon size="14" class="mr-1" />
              {{ retryButtonLabel(item) }}
            </v-btn>
          </template>
        </v-data-table-server>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Job Detail Drawer -->
  <JobDetailDrawer v-model="drawerOpen" :job-id="selectedJobId" />

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarMsg }}
  </v-snackbar>
</template>
