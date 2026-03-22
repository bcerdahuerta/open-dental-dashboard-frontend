<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useCreditStore } from '@/stores/credit';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import {
  FilterIcon,
  DownloadIcon,
  EyeIcon,
} from 'vue-tabler-icons';
import type { CreditFilters, Severity, CreditType } from '@/types/credit';

const router = useRouter();
const creditStore = useCreditStore();
const { records, recordsPagination, loading, error, summary } = storeToRefs(creditStore);
const { fetchRecords, fetchSummary, exportCsv } = creditStore;

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

// Latest completed run for CSV export
const latestRunId = computed(() => {
  if (summary.value.length > 0) return summary.value[0].run_id;
  return null;
});

async function loadRecords() {
  await fetchRecords(filters.value);
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
  if (latestRunId.value) {
    await exportCsv(latestRunId.value);
  }
}

onMounted(async () => {
  await Promise.all([loadRecords(), fetchSummary()]);
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Credit Records">
        <!-- Filter bar -->
        <v-row class="mb-4 align-center">
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
            />
          </v-col>
          <v-col cols="auto" class="ml-auto">
            <v-btn
              color="primary"
              variant="tonal"
              :disabled="!latestRunId"
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
              No credit records found with current filters.
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
