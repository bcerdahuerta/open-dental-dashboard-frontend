<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useCreditStore } from '@/stores/credit';
import { useAuthStore } from '@/stores/auth';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import {
  PlayerPlayIcon,
  RefreshIcon,
  EyeIcon,
  DownloadIcon,
  BuildingIcon,
  FilterIcon,
} from 'vue-tabler-icons';
import type { RunStatus } from '@/types/credit';

const router = useRouter();
const route = useRoute();
const creditStore = useCreditStore();
const authStore = useAuthStore();
const { runs, runsPagination, creditClinics, loading, error } = storeToRefs(creditStore);
const { fetchRuns, triggerRun, fetchCreditClinics, exportCsv } = creditStore;

const showTriggerDialog = ref(false);
const triggerLoading = ref(false);
const selectedClinicIds = ref<string[]>([]);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

// Filters
const selectedClinicFilter = ref<string>('');
const selectedStatusFilter = ref<RunStatus | ''>('');

const isAdmin = computed(() => authStore.user?.role === 'admin');

// Status options for filter
const statusOptions: { title: string; value: RunStatus | '' }[] = [
  { title: 'All Statuses', value: '' },
  { title: 'Pending', value: 'PENDING' },
  { title: 'Running', value: 'RUNNING' },
  { title: 'Completed', value: 'COMPLETED' },
  { title: 'Failed', value: 'FAILED' },
  { title: 'Version Incompatible', value: 'VERSION_INCOMPATIBLE' },
];

// Clinic filter items (single select with "All Clinics")
const clinicFilterItems = computed(() => [
  { title: 'All Clinics', value: '' },
  ...creditClinics.value.map(c => ({ title: c.clinic_name, value: c.id })),
]);

const headers = [
  { title: 'Clinic', key: 'clinic_id', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Patients', key: 'total_patients', align: 'end' as const },
  { title: 'Credits', key: 'total_credits', align: 'end' as const },
  { title: 'Total Amount', key: 'total_credit_amount', align: 'end' as const },
  { title: 'Started', key: 'started_at', sortable: false },
  { title: 'Completed', key: 'completed_at', sortable: false },
  { title: 'Error', key: 'error_message', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
];

function clinicName(clinicId: string): string {
  const clinic = creditClinics.value.find((c) => c.id === clinicId);
  return clinic ? clinic.clinic_name : clinicId.slice(0, 8) + '…';
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'success',
    RUNNING: 'info',
    PENDING: 'warning',
    FAILED: 'error',
    VERSION_INCOMPATIBLE: 'error',
  };
  return map[status] ?? 'secondary';
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

async function openTriggerDialog() {
  await fetchCreditClinics();
  selectedClinicIds.value = [];
  showTriggerDialog.value = true;
}

async function onTrigger() {
  triggerLoading.value = true;
  try {
    const ids = selectedClinicIds.value.length > 0 ? selectedClinicIds.value : undefined;
    const result = await triggerRun(ids);
    if (result?.dispatched === 0) {
      snackbarText.value = result.message || 'No clinics enrolled in credit. Go to Clinic Detail → Products tab to enable.';
      snackbarColor.value = 'warning';
    } else {
      snackbarText.value = `Credit run triggered for ${result?.dispatched || 0} clinic(s)!`;
      snackbarColor.value = 'success';
      await fetchRuns();
    }
  } catch (err: any) {
    snackbarText.value = `Trigger failed: ${err}`;
    snackbarColor.value = 'error';
  } finally {
    triggerLoading.value = false;
    showTriggerDialog.value = false;
    snackbar.value = true;
  }
}

const page = ref(1);
const itemsPerPage = ref(20);

// Build filter params from current state
function buildFilterParams(): { page: number; per_page: number; clinic_id?: string; status?: RunStatus } {
  const params: { page: number; per_page: number; clinic_id?: string; status?: RunStatus } = {
    page: page.value,
    per_page: itemsPerPage.value,
  };
  if (selectedClinicFilter.value) {
    params.clinic_id = selectedClinicFilter.value;
  }
  if (selectedStatusFilter.value) {
    params.status = selectedStatusFilter.value;
  }
  return params;
}

function onTableUpdate(opts: { page: number; itemsPerPage: number }) {
  page.value = opts.page;
  itemsPerPage.value = opts.itemsPerPage;
  fetchRuns(buildFilterParams());
}

function onFilterChange() {
  page.value = 1;
  fetchRuns(buildFilterParams());
}

// Navigation actions
function viewRecords(clinicId: string) {
  router.push({
    path: '/credit/records',
    query: { clinic_id: clinicId },
  });
}

async function exportRunCsv(runId: string, status: string) {
  if (status !== 'COMPLETED') return;
  try {
    await exportCsv(runId);
    snackbarText.value = 'Export downloaded successfully';
    snackbarColor.value = 'success';
    snackbar.value = true;
  } catch (err: any) {
    snackbarText.value = `Export failed: ${err}`;
    snackbarColor.value = 'error';
    snackbar.value = true;
  }
}

// Initialize filters from URL query on mount
function initializeFiltersFromQuery() {
  const queryClinic = route.query.clinic_id as string;
  const queryStatus = route.query.status as RunStatus;
  
  if (queryClinic && creditClinics.value.some(c => c.id === queryClinic)) {
    selectedClinicFilter.value = queryClinic;
  }
  if (queryStatus && statusOptions.some(s => s.value === queryStatus)) {
    selectedStatusFilter.value = queryStatus;
  }
}

// Update URL when filters change (preserving filters in navigation)
watch([selectedClinicFilter, selectedStatusFilter], ([clinic, status]) => {
  const query: Record<string, string> = {};
  if (clinic) query.clinic_id = clinic;
  if (status) query.status = status;
  
  router.replace({
    path: route.path,
    query: Object.keys(query).length > 0 ? query : undefined,
  });
  
  onFilterChange();
});

onMounted(async () => {
  await fetchCreditClinics();
  initializeFiltersFromQuery();
  await fetchRuns(buildFilterParams());
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Credit Run History">
        <!-- Filters & Toolbar -->
        <v-row class="mb-4 align-center">
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="selectedClinicFilter"
              :items="clinicFilterItems"
              label="Filter by Clinic"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details="auto"
            >
              <template #prepend-inner>
                <BuildingIcon size="18" class="text-medium-emphasis" stroke-width="1.5" />
              </template>
            </v-select>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="selectedStatusFilter"
              :items="statusOptions"
              label="Filter by Status"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details="auto"
            >
              <template #prepend-inner>
                <FilterIcon size="18" class="text-medium-emphasis" stroke-width="1.5" />
              </template>
            </v-select>
          </v-col>
          <v-spacer />
          <v-col cols="auto" class="d-flex gap-2">
            <v-btn
              color="secondary"
              variant="tonal"
              size="small"
              @click="fetchRuns(buildFilterParams())"
            >
              <RefreshIcon size="18" class="mr-1" stroke-width="1.5" />
              Refresh
            </v-btn>
            <v-btn
              v-if="isAdmin"
              color="primary"
              variant="flat"
              @click="openTriggerDialog"
            >
              <PlayerPlayIcon size="18" class="mr-1" stroke-width="1.5" />
              Trigger Run
            </v-btn>
          </v-col>
        </v-row>

        <!-- Data table -->
        <v-data-table-server
          :headers="headers"
          :items="runs"
          :items-length="runsPagination.total"
          :loading="loading"
          :items-per-page="20"
          :page="page"
          item-value="id"
          hover
          @update:options="onTableUpdate"
        >
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

          <template #item.total_credit_amount="{ item }">
            <span class="font-weight-bold text-primary">
              ${{ item.total_credit_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00' }}
            </span>
          </template>

          <template #item.started_at="{ item }">
            {{ formatDate(item.started_at) }}
          </template>

          <template #item.completed_at="{ item }">
            {{ formatDate(item.completed_at) }}
          </template>

          <template #item.error_message="{ item }">
            <span v-if="item.error_message" class="text-error text-body-2">
              {{ item.error_message.slice(0, 60) }}{{ item.error_message.length > 60 ? '…' : '' }}
            </span>
            <span v-else class="text-medium-emphasis">—</span>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex align-center justify-center gap-1">
              <v-btn
                icon
                variant="text"
                size="small"
                color="primary"
                title="View Records"
                @click="viewRecords(item.clinic_id)"
              >
                <EyeIcon size="18" stroke-width="1.5" />
              </v-btn>
              <v-btn
                icon
                variant="text"
                size="small"
                color="success"
                :disabled="item.status !== 'COMPLETED'"
                title="Export CSV"
                @click="exportRunCsv(item.id, item.status)"
              >
                <DownloadIcon size="18" stroke-width="1.5" />
              </v-btn>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-8 text-medium-emphasis">
              <template v-if="selectedClinicFilter || selectedStatusFilter">
                <div class="text-body-1 mb-2">No runs match your filters</div>
                <div class="text-body-2">
                  Try adjusting the clinic or status filters, or
                  <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                    @click="selectedClinicFilter = ''; selectedStatusFilter = ''"
                  >
                    clear all filters
                  </v-btn>
                </div>
              </template>
              <template v-else>
                <div class="text-body-1 mb-2">No credit runs found</div>
                <div class="text-body-2">
                  Click "Trigger Run" to start analyzing credits for your clinics.
                </div>
              </template>
            </div>
          </template>
        </v-data-table-server>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Trigger confirm dialog -->
  <v-dialog v-model="showTriggerDialog" max-width="500">
    <v-card>
      <v-card-title class="text-h6">Trigger Credit Run</v-card-title>
      <v-card-text>
        <p class="text-body-1 mb-4">
          Select which clinics to run credit analysis for, or leave empty to run
          for <strong>all enrolled</strong> clinics.
        </p>

        <v-select
          v-model="selectedClinicIds"
          :items="creditClinics"
          item-title="clinic_name"
          item-value="id"
          label="Clinics (optional — empty = all)"
          variant="outlined"
          color="primary"
          multiple
          chips
          closable-chips
          hide-details
        >
          <template #no-data>
            <div class="text-center pa-4 text-medium-emphasis">
              No clinics enrolled in credit.<br />
              Go to Clinic Detail → Products tab to enable.
            </div>
          </template>
        </v-select>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showTriggerDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="triggerLoading"
          :disabled="creditClinics.length === 0"
          @click="onTrigger"
        >
          {{ selectedClinicIds.length > 0 ? `Run ${selectedClinicIds.length} clinic(s)` : 'Run All' }}
        </v-btn>
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
