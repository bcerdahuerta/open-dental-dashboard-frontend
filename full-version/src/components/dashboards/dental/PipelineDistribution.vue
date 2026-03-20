<script setup lang="ts">
import { computed } from 'vue';
import type { QueueStats } from '@/types/writeback';

const props = defineProps<{
  stats: QueueStats;
}>();

const segments = computed(() => {
  const total = props.stats.total || 1; // avoid div by zero
  const pending = props.stats.PENDING ?? 0;
  const active =
    (props.stats.POLLING ?? 0) +
    (props.stats.EXTRACTING ?? 0) +
    (props.stats.EXECUTING ?? 0);
  const done = props.stats.DONE ?? 0;
  const failed = props.stats.FAILED ?? 0;

  return [
    { label: 'Pending', value: pending, pct: Math.round((pending / total) * 100), color: 'warning' },
    { label: 'Active', value: active, pct: Math.round((active / total) * 100), color: 'primary' },
    { label: 'Done', value: done, pct: Math.round((done / total) * 100), color: 'success' },
    { label: 'Failed', value: failed, pct: Math.round((failed / total) * 100), color: 'error' },
  ].filter((s) => s.value > 0);
});

const hasData = computed(() => (props.stats.total ?? 0) > 0);
</script>

<template>
  <div>
    <!-- Stacked bar -->
    <div v-if="hasData" class="d-flex rounded-lg overflow-hidden" style="height: 24px">
      <v-tooltip v-for="seg in segments" :key="seg.label" :text="`${seg.label}: ${seg.value} (${seg.pct}%)`" location="top">
        <template #activator="{ props: tipProps }">
          <div
            v-bind="tipProps"
            :class="`bg-${seg.color}`"
            :style="{ width: seg.pct + '%', minWidth: seg.value > 0 ? '4px' : '0' }"
            class="h-100 transition-all"
          />
        </template>
      </v-tooltip>
    </div>
    <div v-else class="d-flex rounded-lg overflow-hidden bg-containerBg" style="height: 24px">
      <div class="d-flex align-center justify-center w-100">
        <span class="text-caption text-medium-emphasis">No jobs</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="d-flex ga-4 mt-3 flex-wrap">
      <div v-for="seg in [
        { label: 'Pending', color: 'warning', value: stats.PENDING ?? 0 },
        { label: 'Active', color: 'primary', value: (stats.POLLING ?? 0) + (stats.EXTRACTING ?? 0) + (stats.EXECUTING ?? 0) },
        { label: 'Done', color: 'success', value: stats.DONE ?? 0 },
        { label: 'Failed', color: 'error', value: stats.FAILED ?? 0 },
      ]" :key="seg.label" class="d-flex align-center ga-1">
        <div :class="`bg-${seg.color}`" class="rounded-circle" style="width: 8px; height: 8px" />
        <span class="text-caption text-medium-emphasis">{{ seg.label }}: {{ seg.value }}</span>
      </div>
    </div>
  </div>
</template>
