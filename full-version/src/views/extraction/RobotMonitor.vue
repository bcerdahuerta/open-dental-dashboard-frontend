<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useRobotStore } from '@/stores/robot';
import { getRobotStatusColor } from '@/types/robot';
import {
  ActivityIcon,
  AlertTriangleIcon,
  CircleCheckIcon,
  ClockIcon,
  RefreshIcon
} from 'vue-tabler-icons';

const robotStore = useRobotStore();
const { loading, error, workstations, healthyCount, staleCount, totalCount, lastAlertAt } = storeToRefs(robotStore);
const { fetchWorkstations } = robotStore;

const headers = [
  { title: 'Workstation', key: 'workstation_name', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Last Seen', key: 'last_seen_at', sortable: true },
  { title: 'First Seen', key: 'first_seen_at', sortable: true },
  { title: 'Last Alert', key: 'alerted_at', sortable: true },
];

const sortedWorkstations = computed(() => [...workstations.value].sort((a, b) => {
  if (a.status !== b.status) return a.status === 'STALE' ? -1 : 1;
  return a.workstation_name.localeCompare(b.workstation_name);
}));

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 48) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

onMounted(() => {
  fetchWorkstations();
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Robot Monitor">
        <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-3 mb-4">
          <div>
            <h2 class="text-h5 font-weight-bold mb-1">Workstation Heartbeats</h2>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Monitor external robot workstations that continuously read spreadsheets.
            </p>
          </div>
          <v-btn color="primary" variant="flat" :loading="loading" @click="fetchWorkstations">
            <template #prepend>
              <RefreshIcon size="18" stroke-width="1.5" />
            </template>
            Refresh
          </v-btn>
        </div>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <v-row class="mb-2">
          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Total Workstations">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightprimary mr-3" rounded>
                  <ActivityIcon size="22" class="text-primary" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold">{{ totalCount }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Auto-registered robots</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Online">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightsuccess mr-3" rounded>
                  <CircleCheckIcon size="22" class="text-success" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold text-success">{{ healthyCount }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Reported inside window</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Stale">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lighterror mr-3" rounded>
                  <AlertTriangleIcon size="22" class="text-error" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold text-error">{{ staleCount }}</h3>
                  <span class="text-body-2 text-medium-emphasis">No heartbeat in 5h</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Last Alert">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightwarning mr-3" rounded>
                  <ClockIcon size="22" class="text-warning" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h6 font-weight-bold">{{ relativeTime(lastAlertAt) }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Slack stale alert</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
        </v-row>

        <UiParentCard title="Workstations">
          <v-data-table
            :headers="headers"
            :items="sortedWorkstations"
            :loading="loading"
            item-value="id"
            density="comfortable"
          >
            <template #item.workstation_name="{ item }">
              <div class="font-weight-medium">{{ item.workstation_name }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.id }}</div>
            </template>
            <template #item.status="{ item }">
              <v-chip :color="getRobotStatusColor(item.status)" size="small" variant="flat">
                {{ item.status === 'STALE' ? 'Stale' : 'Online' }}
              </v-chip>
            </template>
            <template #item.last_seen_at="{ item }">
              <div class="font-weight-medium">{{ relativeTime(item.last_seen_at) }}</div>
              <div class="text-caption text-medium-emphasis">{{ formatDate(item.last_seen_at) }}</div>
            </template>
            <template #item.first_seen_at="{ item }">
              {{ formatDate(item.first_seen_at) }}
            </template>
            <template #item.alerted_at="{ item }">
              {{ item.alerted_at ? relativeTime(item.alerted_at) : 'Not alerted' }}
            </template>
            <template #no-data>
              <div class="text-medium-emphasis py-6">
                No robot workstations have reported a heartbeat yet.
              </div>
            </template>
          </v-data-table>
        </UiParentCard>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
