<script setup lang="ts">
import { computed } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import type { Encargado, EncargadoAnalytics } from '@/types/extraction';

const props = defineProps<{
  analytics: EncargadoAnalytics | null;
  member: Encargado | null;
  loading: boolean;
}>();

interface DisplayMetrics {
  client_count: number | null;
  clinic_count: number | null;
  verification_volume: number | null;
  completion_rate: number | null;
}

const metrics = computed<DisplayMetrics>(() => {
  if (!props.analytics) {
    return {
      client_count: null,
      clinic_count: null,
      verification_volume: null,
      completion_rate: null,
    };
  }

  return {
    client_count: props.analytics.metrics.client_count,
    clinic_count: props.analytics.metrics.clinic_count,
    verification_volume: props.analytics.metrics.verification_volume,
    completion_rate: props.analytics.metrics.completion_rate,
  };
});

const analyticsState = computed(() => props.analytics?.analytics_status?.state ?? props.member?.analytics_status?.state ?? 'pending');
const missingMetrics = computed(() => props.analytics?.analytics_status?.missing_metrics ?? props.member?.analytics_status?.missing_metrics ?? []);
const hasChartData = computed(() => props.analytics !== null && ((metrics.value.client_count ?? 0) > 0 || (metrics.value.clinic_count ?? 0) > 0));

const chartSeries = computed(() => [{
  name: 'Assignments',
  data: [metrics.value.client_count, metrics.value.clinic_count],
}]);

const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    fontFamily: 'inherit',
    foreColor: 'rgba(var(--v-theme-darkText), var(--v-high-opacity))',
    toolbar: { show: false },
  },
  colors: ['rgba(var(--v-theme-primary), var(--v-high-opacity))'],
  dataLabels: { enabled: false },
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: '50%',
    },
  },
  xaxis: {
    categories: ['Resolved Clients', 'Resolved Clinics'],
  },
  yaxis: {
    title: { text: 'Count' },
  },
  grid: { borderColor: 'rgba(var(--v-theme-borderLight), 1)' },
}));
</script>

<template>
  <UiParentCard title="Analytics">
    <template v-if="loading">
      <div class="d-flex justify-center py-8">
        <v-progress-circular indeterminate color="primary" size="28" />
      </div>
    </template>

    <template v-else>
      <div class="d-flex flex-wrap ga-2 mb-4">
        <v-chip :color="analyticsState === 'ready' ? 'success' : analyticsState === 'partial' ? 'warning' : 'info'" size="small" variant="tonal">
          {{ analyticsState }}
        </v-chip>
        <v-chip v-if="props.analytics?.analytics_status?.updated_at" color="secondary" size="small" variant="tonal">
          Updated {{ new Date(props.analytics.analytics_status.updated_at).toLocaleString() }}
        </v-chip>
      </div>

      <v-row>
        <v-col cols="12" sm="6">
          <v-sheet border rounded class="pa-3">
            <div class="text-caption text-medium-emphasis">Verification Volume</div>
            <div class="text-h6">{{ metrics.verification_volume ?? 'Pending' }}</div>
          </v-sheet>
        </v-col>
        <v-col cols="12" sm="6">
          <v-sheet border rounded class="pa-3">
            <div class="text-caption text-medium-emphasis">Completion Rate</div>
            <div class="text-h6">{{ metrics.completion_rate != null ? `${metrics.completion_rate}%` : 'Pending' }}</div>
          </v-sheet>
        </v-col>
      </v-row>

      <v-alert
        v-if="analyticsState !== 'ready'"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        Metrics pending: {{ missingMetrics.join(', ') || 'none' }}
      </v-alert>

      <div v-if="hasChartData" class="mt-4">
        <apexchart type="bar" height="260" :options="chartOptions" :series="chartSeries" />
      </div>
      <div v-else class="text-body-2 text-medium-emphasis mt-4">
        No backend analytics counts available yet.
      </div>
    </template>
  </UiParentCard>
</template>
