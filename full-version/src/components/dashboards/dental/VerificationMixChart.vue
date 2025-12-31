<script setup lang="ts">
import { ref, computed } from 'vue';

// Mock data for last 7 days verification mix
const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 350,
    fontFamily: 'inherit',
    foreColor: 'rgba(var(--v-theme-darkText), var(--v-high-opacity))',
    toolbar: { show: false }
  },
  colors: [
    'rgba(var(--v-theme-primary), var(--v-high-opacity))',
    'rgba(var(--v-theme-success), var(--v-high-opacity))'
  ],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 4
    }
  },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ['transparent'] },
  xaxis: {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  yaxis: {
    title: { text: 'Verifications' }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right'
  },
  fill: { opacity: 1 },
  tooltip: {
    y: { formatter: (val: number) => `${val} verifications` }
  },
  grid: { borderColor: 'rgba(var(--v-theme-borderLight), 1)' }
}));

// Mock series data: FBD vs ELG counts for last 7 days
const chartSeries = ref([
  {
    name: 'FBD (Full Breakdown)',
    data: [18, 22, 15, 28, 24, 8, 9]
  },
  {
    name: 'ELG (Eligibility)',
    data: [12, 8, 14, 10, 16, 4, 6]
  }
]);
</script>

<template>
  <v-card variant="outlined">
    <v-card-item>
      <v-card-title class="text-subtitle-1">Verification Mix</v-card-title>
      <v-card-subtitle>FBD vs Eligibility - Last 7 Days</v-card-subtitle>
    </v-card-item>
    <v-card-text>
      <apexchart type="bar" height="350" :options="chartOptions" :series="chartSeries" />
    </v-card-text>
  </v-card>
</template>
