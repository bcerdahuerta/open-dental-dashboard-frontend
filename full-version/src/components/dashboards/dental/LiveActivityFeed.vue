<script setup lang="ts">
import { watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { EyeIcon } from 'vue-tabler-icons';
import { useWritebackStore } from '@/stores/writeback';

const props = defineProps<{
  clientId?: string | null;
  clinicId?: string | null;
}>();

const router = useRouter();
const writebackStore = useWritebackStore();
const { jobs, loading } = storeToRefs(writebackStore);

const headers = [
  { title: 'Patient', key: 'patient_name', sortable: true },
  { title: 'Profile', key: 'matched_profile', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
];

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    PENDING: 'warning',
    POLLING: 'info',
    EXTRACTING: 'info',
    EXECUTING: 'primary',
    DONE: 'success',
    FAILED: 'error',
  };
  return colors[status] || 'grey';
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const viewDetails = (jobId: string) => {
  router.push({ path: `/writeback/jobs/${jobId}` });
};

watchEffect(() => {
  writebackStore.fetchJobs({
    per_page: 10,
    client_id: props.clientId ?? undefined,
    clinic_id: props.clinicId ?? undefined,
  });
});
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="jobs"
    :loading="loading"
    :items-per-page="6"
    item-value="id"
    density="comfortable"
    class="elevation-0 border rounded-md"
    no-data-text="No recent activity"
  >
    <!-- Patient Column -->
    <template #item.patient_name="{ item }">
      <span class="font-weight-medium">{{ item.patient_name || 'Unknown' }}</span>
    </template>

    <!-- Profile Column -->
    <template #item.matched_profile="{ item }">
      <v-chip v-if="item.matched_profile" color="primary" variant="tonal" size="small" label>
        {{ item.matched_profile }}
      </v-chip>
      <span v-else class="text-medium-emphasis">—</span>
    </template>

    <!-- Status Column -->
    <template #item.status="{ item }">
      <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
        {{ item.status }}
      </v-chip>
    </template>

    <!-- Created Column -->
    <template #item.created_at="{ item }">
      <span class="text-caption text-medium-emphasis">
        {{ formatDate(item.created_at) }}
      </span>
    </template>

    <!-- Actions Column -->
    <template #item.actions="{ item }">
      <v-btn icon variant="text" size="small" @click="viewDetails(item.id)">
        <EyeIcon stroke-width="1.5" size="20" />
      </v-btn>
    </template>
  </v-data-table>
</template>
