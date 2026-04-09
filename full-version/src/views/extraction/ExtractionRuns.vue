<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useExtractionStore } from '@/stores/extraction';
import {
  RefreshIcon,
} from 'vue-tabler-icons';
import type { ExtractionRun, ExtractionRunFilters } from '@/types/extraction';

const extractionStore = useExtractionStore();
const { runs, runsPagination, selectedRun, clinicNameMap, loading, error } = storeToRefs(extractionStore);
const { hydrateLookups, fetchRuns, fetchRunDetail } = extractionStore;

const pageMeta = ref({ title: 'Extraction Run History' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Extraction', disabled: false, href: '/main/extraction' },
  { title: 'Run History', disabled: true, href: '#' },
]);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

const page = ref(1);
const perPage = ref(20);

const selectedClinicId = ref<string>('');
const selectedStatus = ref<ExtractionRunFilters['status']>('');
const selectedRunType = ref<ExtractionRunFilters['run_type']>('');
const dateFrom = ref('');
const dateTo = ref('');

const showDetailDialog = ref(false);

const statusOptions = [
  { title: 'All', value: '' },
  { title: 'PENDING', value: 'PENDING' },
  { title: 'RUNNING', value: 'RUNNING' },
  { title: 'COMPLETED', value: 'COMPLETED' },
  { title: 'FAILED', value: 'FAILED' },
  { title: 'SKIPPED', value: 'SKIPPED' },
];

const runTypeOptions = [
  { title: 'All', value: '' },
  { title: 'NEW_DATE', value: 'NEW_DATE' },
  { title: 'REVIEW', value: 'REVIEW' },
  { title: 'MANUAL', value: 'MANUAL' },
];

const headers = [
  { title: 'Clinic', key: 'clinic_id', sortable: false },
  { title: 'Run Type', key: 'run_type', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Target Date', key: 'target_date', sortable: false },
  { title: 'OD Rows', key: 'od_rows_count', align: 'end' as const },
  { title: 'Started', key: 'started_at', sortable: false },
  { title: 'Duration', key: 'duration', sortable: false },
];

const clinicItems = computed(() => {
  const items = Object.entries(clinicNameMap.value || {}).map(([value, title]) => ({ value, title }));
  return [{ value: '', title: 'All Clinics' }, ...items];
});

function clinicName(clinicId: string): string {
  return clinicNameMap.value[clinicId] || `${clinicId.slice(0, 8)}…`;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'success',
    RUNNING: 'info',
    FAILED: 'error',
    PENDING: 'warning',
    SKIPPED: 'grey',
  };
  return map[status] ?? 'grey';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(item: ExtractionRun): string {
  if (!item.started_at) return '—';
  const start = new Date(item.started_at).getTime();
  const end = item.completed_at ? new Date(item.completed_at).getTime() : Date.now();
  const diffMs = Math.max(end - start, 0);
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function showSnack(message: string, color: string) {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

function currentFilters(): ExtractionRunFilters {
  const filters: ExtractionRunFilters = {
    clinic_ids: selectedClinicId.value ? [selectedClinicId.value] : [],
    status: selectedStatus.value,
    run_type: selectedRunType.value,
  };

  if (dateFrom.value) filters.date_from = dateFrom.value;
  if (dateTo.value) filters.date_to = dateTo.value;

  return filters;
}

async function refreshRuns() {
  try {
    await fetchRuns({
      ...currentFilters(),
      page: page.value,
      per_page: perPage.value,
    });
  } catch (err: any) {
    showSnack(err?.message || String(err), 'error');
  }
}

async function applyFilters() {
  page.value = 1;
  await refreshRuns();
}

async function clearFilters() {
  selectedClinicId.value = '';
  selectedStatus.value = '';
  selectedRunType.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  page.value = 1;
  await refreshRuns();
}

async function onTableUpdate(opts: { page: number; itemsPerPage: number }) {
  page.value = opts.page;
  perPage.value = opts.itemsPerPage;
  await refreshRuns();
}

async function onRowClick(_: Event, payload: { item: ExtractionRun }) {
  try {
    await fetchRunDetail(payload.item.id);
    showDetailDialog.value = true;
  } catch (err: any) {
    showSnack(err?.message || 'Failed to load run detail', 'error');
  }
}

onMounted(async () => {
  try {
    await hydrateLookups();
    await refreshRuns();
  } catch (err: any) {
    showSnack(err?.message || String(err), 'error');
  }
});
</script>

<template>
  <BaseBreadcrumb :title="pageMeta.title" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard title="Extraction Run History">
        <!-- Toolbar -->
        <div class="d-flex align-center mb-4">
          <v-btn
            color="secondary"
            variant="tonal"
            size="small"
            @click="refreshRuns"
          >
            <RefreshIcon size="18" class="mr-1" stroke-width="1.5" />
            Refresh
          </v-btn>
          <v-spacer />
        </div>

        <v-row class="mb-2">
          <v-col cols="12" md="4" lg="3">
            <v-select
              v-model="selectedClinicId"
              :items="clinicItems"
              item-title="title"
              item-value="value"
              label="Clinic"
              variant="outlined"
              color="primary"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="4" lg="3">
            <div class="text-caption mb-1 text-medium-emphasis">Status</div>
            <v-chip-group
              v-model="selectedStatus"
              selected-class="text-primary"
              column
              filter
              mandatory
            >
              <v-chip
                v-for="status in statusOptions"
                :key="status.value || 'all'"
                :value="status.value"
                size="small"
                variant="outlined"
              >
                {{ status.title }}
              </v-chip>
            </v-chip-group>
          </v-col>

          <v-col cols="12" md="4" lg="2">
            <v-select
              v-model="selectedRunType"
              :items="runTypeOptions"
              item-title="title"
              item-value="value"
              label="Run Type"
              variant="outlined"
              color="primary"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="6" lg="2">
            <v-text-field
              v-model="dateFrom"
              type="date"
              label="Date From"
              variant="outlined"
              color="primary"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="6" lg="2">
            <v-text-field
              v-model="dateTo"
              type="date"
              label="Date To"
              variant="outlined"
              color="primary"
              hide-details
            />
          </v-col>
        </v-row>

        <div class="d-flex align-center mb-4 ga-2">
          <v-btn color="primary" variant="flat" size="small" @click="applyFilters">
            Apply Filters
          </v-btn>
          <v-btn color="secondary" variant="tonal" size="small" @click="clearFilters">
            Clear
          </v-btn>
        </div>

        <!-- Data table -->
        <v-data-table-server
          :headers="headers"
          :items="runs"
          :items-length="runsPagination.total"
          :loading="loading"
          :items-per-page="perPage"
          :page="page"
          item-value="id"
          hover
          @update:options="onTableUpdate"
          @click:row="onRowClick"
        >
          <template #loading>
            <v-skeleton-loader type="table-row@6" />
          </template>

          <template #item.clinic_id="{ item }">
            <span class="font-weight-medium">{{ clinicName(item.clinic_id) }}</span>
          </template>

          <template #item.status="{ item }">
            <v-chip
              size="small"
              :color="statusColor(item.status)"
              variant="flat"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.target_date="{ item }">
            {{ formatDate(item.target_date) }}
          </template>

          <template #item.started_at="{ item }">
            {{ formatDate(item.started_at) }}
          </template>

          <template #item.duration="{ item }">
            {{ formatDuration(item) }}
          </template>

          <template #no-data>
            <div class="text-center pa-8 text-medium-emphasis">
              No extraction runs found for the current filters.
            </div>
          </template>
        </v-data-table-server>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Detail dialog -->
  <v-dialog v-model="showDetailDialog" max-width="780">
    <v-card>
      <v-card-title class="text-h6">Extraction Run Detail</v-card-title>
      <v-card-text v-if="selectedRun">
        <v-row>
          <v-col cols="12" md="6">
            <div class="text-caption text-medium-emphasis">Clinic</div>
            <div class="font-weight-medium mb-3">{{ clinicName(selectedRun.clinic_id) }}</div>

            <div class="text-caption text-medium-emphasis">Run Type</div>
            <div class="mb-3">{{ selectedRun.run_type }}</div>

            <div class="text-caption text-medium-emphasis">Status</div>
            <v-chip size="small" :color="statusColor(selectedRun.status)" variant="flat" class="mb-3">
              {{ selectedRun.status }}
            </v-chip>

            <div class="text-caption text-medium-emphasis">Target Date</div>
            <div class="mb-3">{{ formatDate(selectedRun.target_date) }}</div>

            <div class="text-caption text-medium-emphasis">Duration</div>
            <div>{{ formatDuration(selectedRun) }}</div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="text-caption text-medium-emphasis">OD Rows Count</div>
            <div class="mb-3">{{ selectedRun.od_rows_count }}</div>

            <div class="text-caption text-medium-emphasis">Inserted Rows</div>
            <div class="mb-3">{{ selectedRun.inserted_rows_count }}</div>

            <div class="text-caption text-medium-emphasis">New Patients</div>
            <div class="mb-3">{{ selectedRun.new_patients_count }}</div>

            <div class="text-caption text-medium-emphasis">Started At</div>
            <div class="mb-3">{{ formatDate(selectedRun.started_at) }}</div>

            <div class="text-caption text-medium-emphasis">Completed At</div>
            <div>{{ formatDate(selectedRun.completed_at) }}</div>
          </v-col>

          <v-col cols="12" v-if="selectedRun.status === 'FAILED' && selectedRun.error_message">
            <v-alert type="error" variant="tonal">
              <strong>Error:</strong> {{ selectedRun.error_message }}
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showDetailDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbar -->
  <v-snackbar
    v-model="snackbar"
    :color="snackbarColor"
    :timeout="4000"
    location="bottom right"
  >
    {{ snackbarText }}
  </v-snackbar>

  <!-- Error alert -->
  <v-row v-if="error">
    <v-col cols="12">
      <v-alert type="error" variant="tonal" closable>
        {{ error }}
      </v-alert>
    </v-col>
  </v-row>
</template>
