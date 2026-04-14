<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import { useCreditStore } from '@/stores/credit';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import {
  FilterIcon,
  DownloadIcon,
  EyeIcon,
  BuildingIcon,
} from 'vue-tabler-icons';
import type { CreditFilters, Severity, CreditType } from '@/types/credit';

const router = useRouter();
const route = useRoute();
const creditStore = useCreditStore();
const { records, recordsPagination, loading, error, summary, creditClinics } = storeToRefs(creditStore);
const { fetchRecords, fetchSummary, exportCsv, fetchCreditClinics } = creditStore;

// Clinic selection
const selectedClinicId = ref<string>('');

// Filters
const filters = ref<CreditFilters>({
  sort: 'severity',
  page: 1,
  per_page: 50,
});

const creditTypes: { title: string; value: CreditType | '' }[] = [
  { title: 'All Types', value: '' },
  { title: 'Unapplied Payment', value: 'UnappliedPayment' },
  { title: 'Overpayment', value: 'Overpayment' },
  { title: 'Insurance Overpayment', value: 'InsuranceOverpayment' },
  { title: 'Suspicious Adjustment', value: 'SuspiciousAdjustment' },
  { title: 'Transfer Credit', value: 'TransferCredit' },
  { title: 'Deposit / Prepay', value: 'Deposit' },
  { title: 'Credit Without Source', value: 'CreditWithoutSource' },
];

const severities: { title: string; value: Severity | '' }[] = [
  { title: 'All Severities', value: '' },
  { title: 'High', value: 'High' },
  { title: 'Medium', value: 'Medium' },
  { title: 'Low', value: 'Low' },
];

const sortOptions = [
  { title: 'Severity', value: 'severity' as const },
  { title: 'Amount', value: 'amount' as const },
  { title: 'Age', value: 'age' as const },
];

// Clinic filter items for dropdown
const clinicFilterItems = computed(() => [
  { title: 'Select a Clinic', value: '' },
  ...creditClinics.value.map(c => ({ title: c.clinic_name, value: c.id })),
]);

// v-data-table-server headers
const headers = [
  { title: 'Patient', key: 'patient_name', sortable: false },
  { title: 'Amount', key: 'credit_amount', align: 'end' as const },
  { title: 'Type', key: 'credit_type', sortable: false },
  { title: 'Severity', key: 'severity_score', sortable: false },
  { title: 'Age', key: 'age_bucket', sortable: false },
  { title: 'Disposition', key: 'recommended_disposition', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
];

function severityColor(severity: string): string {
  if (severity === 'High') return 'error';
  if (severity === 'Medium') return 'warning';
  return 'success';
}

function dispositionLabel(d: string): string {
  const map: Record<string, string> = {
    RefundImmediately: 'Refund',
    ApplyAtNextVisit: 'Apply Next Visit',
    ContactPatient: 'Contact Patient',
    RecoupFromInsurance: 'Recoup Insurance',
    ManualReview: 'Manual Review',
  };
  return map[d] ?? d;
}

// Latest completed run for CSV export (scoped to selected clinic)
const latestRunId = computed(() => {
  if (!selectedClinicId.value) return null;
  const clinicSummary = summary.value.find(s => s.clinic_id === selectedClinicId.value);
  return clinicSummary?.run_id ?? null;
});

// Clinic name for display
const selectedClinicName = computed(() => {
  if (!selectedClinicId.value) return '';
  const clinic = creditClinics.value.find(c => c.id === selectedClinicId.value);
  return clinic?.clinic_name ?? '';
});

async function loadRecords() {
  // Only load records if a clinic is selected
  if (!selectedClinicId.value) {
    return;
  }
  await fetchRecords({
    ...filters.value,
    clinic_id: selectedClinicId.value,
    run_id: latestRunId.value ?? undefined,
  });
}

async function onClinicChange() {
  // Reset filters when clinic changes
  filters.value.page = 1;
  // Fetch summary for the selected clinic to get latest run
  await fetchSummary(selectedClinicId.value || undefined);
  // Load records with the new clinic context
  await loadRecords();
}

function onFilterChange() {
  filters.value.page = 1;
  loadRecords();
}

function onTableUpdate(opts: { page: number; itemsPerPage: number }) {
  filters.value.page = opts.page;
  filters.value.per_page = opts.itemsPerPage;
  loadRecords();
}

function viewRecord(id: string) {
  router.push(`/credit/records/${id}`);
}

async function onExport() {
  if (!selectedClinicId.value) {
    // Safety guard: cannot export without selecting a clinic
    return;
  }
  if (latestRunId.value) {
    await exportCsv(latestRunId.value);
  }
}

// Update route query when clinic selection changes
watch(selectedClinicId, (newClinicId) => {
  const query: Record<string, string> = {};
  if (newClinicId) {
    query.clinic_id = newClinicId;
  }
  
  router.replace({
    path: route.path,
    query: Object.keys(query).length > 0 ? query : undefined,
  });
});

onMounted(async () => {
  // Load clinics first so user can select
  await fetchCreditClinics();
  
  // Check for clinic_id in route query and preselect if valid
  const queryClinicId = route.query.clinic_id as string;
  if (queryClinicId && creditClinics.value.some(c => c.id === queryClinicId)) {
    selectedClinicId.value = queryClinicId;
    // Auto-load the clinic's data
    await onClinicChange();
  }
  // Otherwise, wait for explicit clinic selection (current behavior)
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Credit Records">
        <!-- Filter bar -->
        <v-row class="mb-4 align-center">
          <!-- Clinic Filter -->
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="selectedClinicId"
              :items="clinicFilterItems"
              label="Filter by Clinic"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details="auto"
              @update:model-value="onClinicChange"
            >
              <template #prepend-inner>
                <BuildingIcon size="18" class="text-medium-emphasis" stroke-width="1.5" />
              </template>
            </v-select>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.credit_type"
              :items="creditTypes"
              label="Credit Type"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details="auto"
              @update:model-value="onFilterChange"
              :disabled="!selectedClinicId"
            >
              <template #prepend-inner>
                <FilterIcon size="18" class="text-medium-emphasis" stroke-width="1.5" />
              </template>
            </v-select>
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="filters.severity"
              :items="severities"
              label="Severity"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details="auto"
              @update:model-value="onFilterChange"
              :disabled="!selectedClinicId"
            />
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="filters.sort"
              :items="sortOptions"
              label="Sort By"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details="auto"
              @update:model-value="onFilterChange"
              :disabled="!selectedClinicId"
            />
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <v-select
              v-model="filters.excluded"
              :items="[{ title: 'All', value: '' }, { title: 'Active Only', value: 'false' }, { title: 'Excluded Only', value: 'true' }]"
              label="Status"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details="auto"
              @update:model-value="onFilterChange"
              :disabled="!selectedClinicId"
            />
          </v-col>
          <v-col cols="auto" class="ml-auto">
            <v-btn
              color="primary"
              variant="tonal"
              :disabled="!selectedClinicId || !latestRunId"
              @click="onExport"
            >
              <DownloadIcon size="18" class="mr-1" stroke-width="1.5" />
              Export CSV
            </v-btn>
          </v-col>
        </v-row>

        <!-- Data table -->
        <v-data-table-server
          :headers="headers"
          :items="records"
          :items-length="recordsPagination.total"
          :loading="loading"
          :items-per-page="filters.per_page"
          :page="filters.page"
          item-value="id"
          hover
          @update:options="onTableUpdate"
        >
          <template #top>
            <div v-if="selectedClinicId && latestRunId" class="px-4 py-2 text-caption text-medium-emphasis bg-surface-variant">
              Showing records for: <span class="font-weight-medium">{{ selectedClinicName }}</span>
              <span v-if="latestRunId" class="ml-2">(Run: {{ latestRunId.slice(0, 8) }}...)</span>
            </div>
          </template>
          <template #item.patient_name="{ item }">
            <span class="font-weight-medium">{{ item.patient_name ?? '—' }}</span>
          </template>

          <template #item.credit_amount="{ item }">
            <span class="font-weight-bold text-primary">
              ${{ Math.abs(item.credit_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
            </span>
          </template>

          <template #item.credit_type="{ item }">
            <v-chip size="small" variant="tonal" color="secondary">
              {{ item.credit_type }}
            </v-chip>
          </template>

          <template #item.severity_score="{ item }">
            <v-chip
              size="small"
              :color="severityColor(item.severity_score)"
              variant="flat"
            >
              {{ item.severity_score }}
            </v-chip>
          </template>

          <template #item.age_bucket="{ item }">
            {{ item.age_bucket ?? '—' }}
          </template>

          <template #item.recommended_disposition="{ item }">
            <span class="text-body-2">{{ dispositionLabel(item.recommended_disposition) }}</span>
          </template>

          <template #item.actions="{ item }">
            <v-btn
              icon
              variant="text"
              size="small"
              color="primary"
              @click="viewRecord(item.id)"
            >
              <EyeIcon size="18" stroke-width="1.5" />
            </v-btn>
          </template>

          <template #no-data>
            <div class="text-center pa-8 text-medium-emphasis">
              <template v-if="!selectedClinicId">
                <BuildingIcon size="48" class="mb-4" stroke-width="1" />
                <div class="text-h6 mb-2">Select a Clinic</div>
                <div class="text-body-2">Choose a clinic above to view credit records.</div>
              </template>
              <template v-else-if="loading">
                <v-progress-circular indeterminate color="primary" class="mb-4" />
                <div class="text-body-2">Loading records...</div>
              </template>
              <template v-else>
                <div class="text-body-2">No credit records found for {{ selectedClinicName }} with current filters.</div>
              </template>
            </div>
          </template>
        </v-data-table-server>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Error alert -->
  <v-row v-if="error">
    <v-col cols="12">
      <v-alert type="error" variant="tonal" closable>
        {{ error }}
      </v-alert>
    </v-col>
  </v-row>
</template>
