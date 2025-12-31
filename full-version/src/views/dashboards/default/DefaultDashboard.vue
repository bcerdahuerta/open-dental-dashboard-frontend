<script setup lang="ts">
import { ref } from 'vue';
import {
  CircleCheckIcon,
  ClockIcon,
  DatabaseIcon,
  AlertTriangleIcon
} from 'vue-tabler-icons';

// Import dental dashboard components
import LiveActivityFeed from '@/components/dashboards/dental/LiveActivityFeed.vue';
import VerificationMixChart from '@/components/dashboards/dental/VerificationMixChart.vue';

// KPI Card mock data
const kpiCards = ref([
  {
    title: 'Daily Volume',
    value: 124,
    subtitle: 'Verifications Today',
    color: 'primary',
    bgColor: 'lightprimary',
    icon: CircleCheckIcon
  },
  {
    title: 'QA Pending',
    value: 18,
    subtitle: 'Waiting for QA',
    color: 'warning',
    bgColor: 'lightwarning',
    icon: ClockIcon
  },
  {
    title: 'Writeback Queue',
    value: 5,
    subtitle: 'Ready for Open Dental',
    color: 'secondary',
    bgColor: 'lightsecondary',
    icon: DatabaseIcon
  },
  {
    title: 'Critical Errors',
    value: 3,
    subtitle: 'Not Found / Failed',
    color: 'error',
    bgColor: 'lighterror',
    icon: AlertTriangleIcon
  }
]);
</script>

<template>
  <v-row>
    <!-- KPI Cards Row -->
    <v-col v-for="(card, index) in kpiCards" :key="index" cols="12" sm="6" lg="3">
      <v-card variant="outlined" :class="`bg-${card.bgColor}`">
        <v-card-text>
          <div class="d-flex align-center justify-space-between">
            <div>
              <h2 class="text-h2 font-weight-bold" :class="`text-${card.color}`">
                {{ card.value }}
              </h2>
              <span class="text-subtitle-2 text-medium-emphasis d-block mt-1">
                {{ card.subtitle }}
              </span>
            </div>
            <v-avatar :color="card.color" size="48" rounded="lg">
              <component :is="card.icon" stroke-width="1.5" size="24" class="text-white" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Live Activity Feed (Table) -->
    <v-col cols="12" lg="8">
      <LiveActivityFeed />
    </v-col>

    <!-- Verification Mix Chart -->
    <v-col cols="12" lg="4">
      <VerificationMixChart />
    </v-col>
  </v-row>
</template>
