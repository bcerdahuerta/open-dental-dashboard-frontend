<script setup lang="ts">
import { computed } from 'vue';
import type { QueueStats } from '@/types/writeback';

interface ClinicHealthRow {
  clinicId: string;
  clinicName: string;
  stats: QueueStats;
}

const props = defineProps<{
  rows: ClinicHealthRow[];
  loading: boolean;
}>();

const headers = [
  { title: 'Clinic', key: 'clinicName', sortable: true },
  { title: 'Pending', key: 'pending', sortable: true, align: 'center' as const },
  { title: 'Active', key: 'active', sortable: true, align: 'center' as const },
  { title: 'Done', key: 'done', sortable: true, align: 'center' as const },
  { title: 'Failed', key: 'failed', sortable: true, align: 'center' as const },
  { title: 'Status', key: 'status', sortable: false, align: 'center' as const },
];

const tableItems = computed(() =>
  props.rows.map((row) => ({
    clinicId: row.clinicId,
    clinicName: row.clinicName,
    pending: row.stats.PENDING ?? 0,
    active: (row.stats.POLLING ?? 0) + (row.stats.EXTRACTING ?? 0) + (row.stats.EXECUTING ?? 0),
    done: row.stats.DONE ?? 0,
    failed: row.stats.FAILED ?? 0,
    total: row.stats.total ?? 0,
    status: (row.stats.FAILED ?? 0) > 0 ? 'error' : (row.stats.PENDING ?? 0) > 0 ? 'warning' : 'success',
  }))
);
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="tableItems"
    :loading="loading"
    :items-per-page="10"
    item-value="clinicId"
    density="comfortable"
    class="border rounded-md"
    no-data-text="Select a client to view clinic health"
  >
    <template #item.pending="{ item }">
      <v-chip v-if="item.pending > 0" color="warning" variant="tonal" size="small" label>
        {{ item.pending }}
      </v-chip>
      <span v-else class="text-medium-emphasis">0</span>
    </template>

    <template #item.active="{ item }">
      <v-chip v-if="item.active > 0" color="primary" variant="tonal" size="small" label>
        {{ item.active }}
      </v-chip>
      <span v-else class="text-medium-emphasis">0</span>
    </template>

    <template #item.done="{ item }">
      <v-chip v-if="item.done > 0" color="success" variant="tonal" size="small" label>
        {{ item.done }}
      </v-chip>
      <span v-else class="text-medium-emphasis">0</span>
    </template>

    <template #item.failed="{ item }">
      <v-chip v-if="item.failed > 0" color="error" variant="flat" size="small" label>
        {{ item.failed }}
      </v-chip>
      <span v-else class="text-medium-emphasis">0</span>
    </template>

    <template #item.status="{ item }">
      <v-icon
        :color="item.status"
        :icon="item.status === 'error' ? 'mdi-alert-circle' : item.status === 'warning' ? 'mdi-clock-outline' : 'mdi-check-circle'"
        size="20"
      />
    </template>
  </v-data-table>
</template>
