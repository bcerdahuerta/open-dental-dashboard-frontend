<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import {
  ClockIcon,
  LoaderIcon,
  CircleCheckIcon,
  AlertCircleIcon,
} from 'vue-tabler-icons';
import { useWritebackStore } from '@/stores/writeback';

const writebackStore = useWritebackStore();
const { queueStats } = storeToRefs(writebackStore);

// Computed stat cards driven by live data
const statsCards = computed(() => [
  {
    title: 'Pending',
    value: queueStats.value.PENDING,
    subtitle: 'Waiting in queue',
    color: 'warning',
    bgColor: 'lightwarning',
    icon: ClockIcon,
  },
  {
    title: 'Active',
    value:
      queueStats.value.POLLING +
      queueStats.value.EXTRACTING +
      queueStats.value.EXECUTING,
    subtitle: 'Currently processing',
    color: 'primary',
    bgColor: 'lightprimary',
    icon: LoaderIcon,
  },
  {
    title: 'Done',
    value: queueStats.value.DONE,
    subtitle: 'Successfully written back',
    color: 'success',
    bgColor: 'lightsuccess',
    icon: CircleCheckIcon,
  },
  {
    title: 'Failed',
    value: queueStats.value.FAILED,
    subtitle: 'Errors requiring attention',
    color: 'error',
    bgColor: 'lighterror',
    icon: AlertCircleIcon,
  },
]);

// Auto-refresh every 5 seconds
let statsInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  writebackStore.fetchQueueStats();
  statsInterval = setInterval(() => {
    writebackStore.fetchQueueStats();
  }, 5000);
});

onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
});
</script>

<template>
  <v-row>
    <!-- Live Stats Cards -->
    <v-col v-for="(card, index) in statsCards" :key="index" cols="12" sm="6" lg="3">
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

    <!-- Total Jobs Summary -->
    <v-col cols="12">
      <v-card variant="outlined">
        <v-card-text class="d-flex align-center justify-space-between pa-4">
          <div class="d-flex align-center ga-3">
            <v-chip color="primary" variant="tonal" size="small">
              Total: {{ queueStats.total }}
            </v-chip>
            <span class="text-body-2 text-medium-emphasis">
              Jobs processed through the writeback pipeline
            </span>
          </div>
          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            to="/writeback/live"
          >
            View Live Activity
          </v-btn>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
