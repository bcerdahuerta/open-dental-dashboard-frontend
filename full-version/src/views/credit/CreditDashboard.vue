<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useCreditStore } from '@/stores/credit';
import { useClinicStore } from '@/stores/clinics';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import {
  CreditCardIcon,
  UsersIcon,
  AlertTriangleIcon,
  ChartBarIcon,
} from 'vue-tabler-icons';

const creditStore = useCreditStore();
const clinicsStore = useClinicStore();
const { summary, loading, error } = storeToRefs(creditStore);
const { fetchSummary } = creditStore;

const selectedClinic = ref<string>('');

// Computed KPIs
const totalCreditAmount = computed(() =>
  summary.value.reduce((sum, s) => sum + s.total_credit_amount, 0)
);
const totalPatients = computed(() =>
  summary.value.reduce((sum, s) => sum + s.total_credits, 0)
);
const totalExceptions = computed(() =>
  summary.value.reduce((sum, s) => sum + s.total_exceptions, 0)
);
const clinicCount = computed(() => summary.value.length);

// Aging chart options (donut — credit type breakdown)
const typeChartOptions = computed(() => ({
  chart: { type: 'donut' as const, fontFamily: 'inherit' },
  labels: summary.value.map((s) => s.clinic_id),
  colors: ['#5e35b1', '#1e88e5', '#43a047', '#fb8c00', '#e53935', '#8e24aa', '#00897b'],
  legend: { position: 'bottom' as const },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total Credit',
            formatter: () => `$${totalCreditAmount.value.toLocaleString()}`,
          },
        },
      },
    },
  },
}));
const typeSeries = computed(() => summary.value.map((s) => s.total_credit_amount));

// Bar chart — patients per clinic
const barChartOptions = computed(() => ({
  chart: { type: 'bar' as const, fontFamily: 'inherit', toolbar: { show: false } },
  xaxis: {
    categories: summary.value.map((s) => s.clinic_id.slice(0, 8)),
  },
  colors: ['#5e35b1'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
}));
const barSeries = computed(() => [
  { name: 'Credits', data: summary.value.map((s) => s.total_credits) },
]);

const hasData = computed(() => summary.value.length > 0);

async function onClinicChange() {
  await fetchSummary(selectedClinic.value || undefined);
}

onMounted(async () => {
  await fetchSummary();
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
              :items="[{ title: 'All Clinics', value: '' }, ...summary.map(s => ({ title: s.clinic_id.slice(0, 8), value: s.clinic_id }))]"
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
      <UiParentCard title="Total Credit">
        <div class="d-flex align-center">
          <v-avatar size="48" class="bg-lightprimary mr-3" rounded>
            <CreditCardIcon size="24" class="text-primary" stroke-width="1.5" />
          </v-avatar>
          <div>
            <h3 class="text-h5 font-weight-bold text-primary">
              ${{ totalCreditAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
            </h3>
            <span class="text-body-2 text-medium-emphasis">Across {{ clinicCount }} clinic(s)</span>
          </div>
        </div>
      </UiParentCard>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <UiParentCard title="Patients with Credit">
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
      <UiParentCard title="Exceptions">
        <div class="d-flex align-center">
          <v-avatar size="48" class="bg-lighterror mr-3" rounded>
            <AlertTriangleIcon size="24" class="text-error" stroke-width="1.5" />
          </v-avatar>
          <div>
            <h3 class="text-h5 font-weight-bold text-error">{{ totalExceptions }}</h3>
            <span class="text-body-2 text-medium-emphasis">Require attention</span>
          </div>
        </div>
      </UiParentCard>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <UiParentCard title="Clinics Analyzed">
        <div class="d-flex align-center">
          <v-avatar size="48" class="bg-lightsuccess mr-3" rounded>
            <ChartBarIcon size="24" class="text-success" stroke-width="1.5" />
          </v-avatar>
          <div>
            <h3 class="text-h5 font-weight-bold text-success">{{ clinicCount }}</h3>
            <span class="text-body-2 text-medium-emphasis">Latest runs</span>
          </div>
        </div>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Charts row -->
  <v-row v-if="hasData">
    <v-col cols="12" md="6">
      <UiParentCard title="Credit by Clinic">
        <apexchart
          type="donut"
          height="320"
          :options="typeChartOptions"
          :series="typeSeries"
        />
      </UiParentCard>
    </v-col>
    <v-col cols="12" md="6">
      <UiParentCard title="Credits per Clinic">
        <apexchart
          type="bar"
          height="320"
          :options="barChartOptions"
          :series="barSeries"
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
