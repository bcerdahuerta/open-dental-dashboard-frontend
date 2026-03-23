<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useCreditStore } from '@/stores/credit';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import {
  CreditCardIcon,
  UsersIcon,
  ClockIcon,
  AlertTriangleIcon,
} from 'vue-tabler-icons';

const creditStore = useCreditStore();
const { summary, creditClinics, loading, error } = storeToRefs(creditStore);
const { fetchSummary, fetchCreditClinics } = creditStore;

const selectedClinic = ref<string>('');

// ---------------------------------------------------------------------------
// Computed — KPIs (aggregate across all clinics in view)
// ---------------------------------------------------------------------------
const totalCreditAmount = computed(() =>
  summary.value.reduce((sum, s) => sum + s.total_credit_amount, 0)
);
const totalPatients = computed(() =>
  summary.value.reduce((sum, s) => sum + s.total_credits, 0)
);
const avgAgeDays = computed(() => {
  if (!summary.value.length) return 0;
  const total = summary.value.reduce((sum, s) => sum + (s.avg_age_days || 0), 0);
  return Math.round(total / summary.value.length);
});
const actionRequiredCount = computed(() =>
  summary.value.reduce((sum, s) => sum + (s.action_required_count || 0), 0)
);
const clinicLabel = computed(() => {
  if (summary.value.length === 1) return summary.value[0].clinic_name || 'Unknown';
  return `Across ${summary.value.length} clinic(s)`;
});

// ---------------------------------------------------------------------------
// Computed — Aging Distribution chart (horizontal bar)
// ---------------------------------------------------------------------------
const agingBuckets = ['0-30', '31-60', '61-90', '90+'] as const;
const agingColors = ['#43a047', '#fb8c00', '#ff7043', '#e53935'];

const agingChartOptions = computed(() => ({
  chart: { type: 'bar' as const, fontFamily: 'inherit', toolbar: { show: false } },
  plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
  colors: agingColors,
  xaxis: {
    categories: agingBuckets as unknown as string[],
    labels: { formatter: (v: number) => `$${v.toLocaleString()}` },
  },
  dataLabels: {
    enabled: true,
    formatter: (_val: number, opt: any) => {
      const idx = opt.dataPointIndex;
      const bucket = agingBuckets[idx];
      const merged = mergedAging.value;
      const item = merged[bucket];
      return item ? `$${item.amount.toLocaleString()} (${item.count})` : '';
    },
    style: { fontSize: '11px', colors: ['#fff'] },
  },
  tooltip: {
    y: {
      formatter: (_val: number, opt: any) => {
        const bucket = agingBuckets[opt.dataPointIndex];
        const item = mergedAging.value[bucket];
        return item ? `$${item.amount.toLocaleString()} — ${item.count} patients` : '';
      },
    },
  },
  legend: { show: false },
}));

const mergedAging = computed(() => {
  const result: Record<string, { count: number; amount: number }> = {};
  for (const b of agingBuckets) result[b] = { count: 0, amount: 0 };
  for (const s of summary.value) {
    const dist = s.aging_distribution || {};
    for (const b of agingBuckets) {
      if (dist[b]) {
        result[b].count += dist[b].count;
        result[b].amount += dist[b].amount;
      }
    }
  }
  return result;
});

const agingSeries = computed(() => [{
  name: 'Credit Amount',
  data: agingBuckets.map((b, i) => ({
    x: b,
    y: Math.round(mergedAging.value[b].amount * 100) / 100,
    fillColor: agingColors[i],
  })),
}]);

// ---------------------------------------------------------------------------
// Computed — Recommended Actions donut
// ---------------------------------------------------------------------------
const dispositionLabels: Record<string, string> = {
  ApplyAtNextVisit: 'Apply at Next Visit',
  ContactPatient: 'Contact Patient',
  RefundImmediately: 'Refund Immediately',
  DataIntegrityReview: 'Data Review',
  ManualReview: 'Manual Review',
  RecoupFromInsurance: 'Recoup from Insurance',
};
const dispositionColors: Record<string, string> = {
  ApplyAtNextVisit: '#1e88e5',
  ContactPatient: '#fb8c00',
  RefundImmediately: '#e53935',
  DataIntegrityReview: '#78909c',
  ManualReview: '#78909c',
  RecoupFromInsurance: '#8e24aa',
};

const mergedDispositions = computed(() => {
  const result: Record<string, { count: number; amount: number }> = {};
  for (const s of summary.value) {
    const dist = s.disposition_distribution || {};
    for (const [key, val] of Object.entries(dist)) {
      if (!result[key]) result[key] = { count: 0, amount: 0 };
      result[key].count += val.count;
      result[key].amount += val.amount;
    }
  }
  return result;
});

const donutChartOptions = computed(() => ({
  chart: { type: 'donut' as const, fontFamily: 'inherit' },
  labels: Object.keys(mergedDispositions.value).map(k => dispositionLabels[k] || k),
  colors: Object.keys(mergedDispositions.value).map(k => dispositionColors[k] || '#5e35b1'),
  legend: { position: 'bottom' as const, fontSize: '12px' },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Patients',
            formatter: () => `${totalPatients.value}`,
          },
        },
      },
    },
  },
  tooltip: {
    y: {
      formatter: (val: number) => `${val} patients`,
    },
  },
}));
const donutSeries = computed(() =>
  Object.values(mergedDispositions.value).map(v => v.count)
);

// ---------------------------------------------------------------------------
// Computed — Credit by Type bar chart
// ---------------------------------------------------------------------------
const mergedTypes = computed(() => {
  const result: Record<string, { count: number; amount: number }> = {};
  for (const s of summary.value) {
    const dist = s.credit_type_distribution || {};
    for (const [key, val] of Object.entries(dist)) {
      if (!result[key]) result[key] = { count: 0, amount: 0 };
      result[key].count += val.count;
      result[key].amount += val.amount;
    }
  }
  return result;
});

const typeLabels: Record<string, string> = {
  Overpayment: 'Overpayment',
  UnappliedPayment: 'Unapplied Payment',
  CreditWithoutSource: 'No Source',
  InsuranceOverpayment: 'Insurance Overpay',
  SuspiciousAdjustment: 'Suspicious Adj.',
  TransferCredit: 'Transfer Credit',
  Deposit: 'Deposit',
};

const typeBarOptions = computed(() => ({
  chart: { type: 'bar' as const, fontFamily: 'inherit', toolbar: { show: false } },
  xaxis: {
    categories: Object.keys(mergedTypes.value).map(k => typeLabels[k] || k),
  },
  colors: ['#7c4dff'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => `$${val.toLocaleString()}`,
    style: { fontSize: '11px' },
  },
  tooltip: {
    y: {
      formatter: (val: number, opt: any) => {
        const keys = Object.keys(mergedTypes.value);
        const item = mergedTypes.value[keys[opt.dataPointIndex]];
        return item ? `$${val.toLocaleString()} — ${item.count} patients` : `$${val}`;
      },
    },
  },
}));
const typeBarSeries = computed(() => [{
  name: 'Amount',
  data: Object.values(mergedTypes.value).map(v => Math.round(v.amount * 100) / 100),
}]);

// ---------------------------------------------------------------------------
// Computed — Exception summary (from summary data, no extra call)
// ---------------------------------------------------------------------------
const mergedExceptions = computed(() => {
  const result: Record<string, { severity: string; count: number }> = {};
  for (const s of summary.value) {
    for (const exc of s.exception_summary || []) {
      const key = exc.flag_type;
      if (!result[key]) result[key] = { severity: exc.severity, count: 0 };
      result[key].count += exc.count;
    }
  }
  return Object.entries(result)
    .map(([flag_type, v]) => ({ flag_type, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
});

// ---------------------------------------------------------------------------
// Clinic filter
// ---------------------------------------------------------------------------
const clinicFilterItems = computed(() => [
  { title: 'All Clinics', value: '' },
  ...creditClinics.value.map(c => ({ title: c.clinic_name, value: c.id })),
]);

const hasData = computed(() => summary.value.length > 0);

async function onClinicChange() {
  await fetchSummary(selectedClinic.value || undefined);
}

const severityColor = (sev: string) => {
  if (sev === 'High') return 'error';
  if (sev === 'Medium') return 'warning';
  return 'success';
};

const exceptionLabel = (type: string) =>
  type.replace(/([A-Z])/g, ' $1').trim();

onMounted(async () => {
  await Promise.all([fetchSummary(), fetchCreditClinics()]);
});
</script>

<template>
  <v-row>
    <!-- Clinic filter -->
    <v-col cols="12">
      <UiParentCard title="Credit Dashboard">
        <v-row class="align-center mb-2">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedClinic"
              :items="clinicFilterItems"
              label="Filter by Clinic"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details="auto"
              @update:model-value="onClinicChange"
            />
          </v-col>
        </v-row>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Empty state -->
  <v-row v-if="!loading && !hasData">
    <v-col cols="12">
      <UiParentCard title="No Data">
        <div class="d-flex flex-column align-center pa-8">
          <CreditCardIcon size="64" class="text-medium-emphasis mb-4" stroke-width="1" />
          <h3 class="text-h6 text-medium-emphasis mb-2">No credit data available</h3>
          <p class="text-body-2 text-medium-emphasis">
            Trigger a credit run to start analyzing patient balances.
          </p>
          <v-btn color="primary" variant="flat" to="/credit/runs" class="mt-4">
            Go to Run History
          </v-btn>
        </div>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- KPI cards -->
  <v-row v-if="hasData">
    <v-col cols="12" sm="6" lg="3">
      <UiParentCard title="Total Credit Exposure">
        <div class="d-flex align-center">
          <v-avatar size="48" class="bg-lighterror mr-3" rounded>
            <CreditCardIcon size="24" class="text-error" stroke-width="1.5" />
          </v-avatar>
          <div>
            <h3 class="text-h5 font-weight-bold text-error">
              ${{ totalCreditAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
            </h3>
            <span class="text-body-2 text-medium-emphasis">{{ clinicLabel }}</span>
          </div>
        </div>
      </UiParentCard>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <UiParentCard title="Patients Affected">
        <div class="d-flex align-center">
          <v-avatar size="48" class="bg-lightsecondary mr-3" rounded>
            <UsersIcon size="24" class="text-secondary" stroke-width="1.5" />
          </v-avatar>
          <div>
            <h3 class="text-h5 font-weight-bold">{{ totalPatients }}</h3>
            <span class="text-body-2 text-medium-emphasis">Active credit records</span>
          </div>
        </div>
      </UiParentCard>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <UiParentCard title="Avg Credit Age">
        <div class="d-flex align-center">
          <v-avatar size="48" :class="avgAgeDays > 90 ? 'bg-lighterror' : 'bg-lightwarning'" class="mr-3" rounded>
            <ClockIcon size="24" :class="avgAgeDays > 90 ? 'text-error' : 'text-warning'" stroke-width="1.5" />
          </v-avatar>
          <div>
            <h3 class="text-h5 font-weight-bold" :class="avgAgeDays > 90 ? 'text-error' : 'text-warning'">
              {{ avgAgeDays }} days
            </h3>
            <span class="text-body-2 text-medium-emphasis">
              {{ avgAgeDays > 90 ? 'Above 90d threshold' : 'Within range' }}
            </span>
          </div>
        </div>
      </UiParentCard>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <UiParentCard title="Action Required">
        <div class="d-flex align-center">
          <v-avatar size="48" class="bg-lightwarning mr-3" rounded>
            <AlertTriangleIcon size="24" class="text-warning" stroke-width="1.5" />
          </v-avatar>
          <div>
            <h3 class="text-h5 font-weight-bold text-warning">{{ actionRequiredCount }}</h3>
            <span class="text-body-2 text-medium-emphasis">Need contact or refund</span>
          </div>
        </div>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Charts row 1: Aging + Actions donut -->
  <v-row v-if="hasData">
    <v-col cols="12" md="6">
      <UiParentCard title="Credit Aging Distribution">
        <apexchart
          type="bar"
          height="320"
          :options="agingChartOptions"
          :series="agingSeries"
        />
      </UiParentCard>
    </v-col>
    <v-col cols="12" md="6">
      <UiParentCard title="Recommended Actions">
        <apexchart
          type="donut"
          height="320"
          :options="donutChartOptions"
          :series="donutSeries"
        />
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Charts row 2: Exceptions table + Credit by Type -->
  <v-row v-if="hasData">
    <v-col cols="12" md="6">
      <UiParentCard title="Top Exceptions">
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Exception Type</th>
              <th class="text-right">Count</th>
              <th class="text-center">Severity</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exc in mergedExceptions" :key="exc.flag_type">
              <td>{{ exceptionLabel(exc.flag_type) }}</td>
              <td class="text-right font-weight-bold">{{ exc.count }}</td>
              <td class="text-center">
                <v-chip :color="severityColor(exc.severity)" size="small" variant="flat">
                  {{ exc.severity }}
                </v-chip>
              </td>
            </tr>
            <tr v-if="!mergedExceptions.length">
              <td colspan="3" class="text-center text-medium-emphasis">No exceptions</td>
            </tr>
          </tbody>
        </v-table>
      </UiParentCard>
    </v-col>
    <v-col cols="12" md="6">
      <UiParentCard title="Credit by Type">
        <apexchart
          type="bar"
          height="280"
          :options="typeBarOptions"
          :series="typeBarSeries"
        />
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

  <!-- Loading overlay -->
  <v-overlay :model-value="loading" class="d-flex align-center justify-center" contained>
    <v-progress-circular indeterminate color="primary" size="48" />
  </v-overlay>
</template>
