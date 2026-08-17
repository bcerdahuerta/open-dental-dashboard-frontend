<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  ClockIcon,
  LoaderIcon,
  CircleCheckIcon,
  AlertCircleIcon,
  RefreshIcon,
  ActivityIcon,
} from 'vue-tabler-icons';
import { useWritebackStore } from '@/stores/writeback';
import { useClientStore } from '@/stores/clients';
import { useClinicStore } from '@/stores/clinics';
import type { QueueStats } from '@/types/writeback';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import StatCard from '@/components/dashboards/dental/StatCard.vue';
import ClinicHealthTable from '@/components/dashboards/dental/ClinicHealthTable.vue';
import PipelineDistribution from '@/components/dashboards/dental/PipelineDistribution.vue';
import LiveActivityFeed from '@/components/dashboards/dental/LiveActivityFeed.vue';

// --- Page metadata ---
const page = ref({ title: 'Operations Hub' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '#' },
  { title: 'Operations Hub', disabled: true, href: '#' },
]);

// --- Stores ---
const writebackStore = useWritebackStore();
const clientStore = useClientStore();
const clinicStore = useClinicStore();

const { queueStats, clinicStatsMap } = storeToRefs(writebackStore);
const { clients } = storeToRefs(clientStore);
const { clinics, loading: clinicsLoading } = storeToRefs(clinicStore);

// --- Filter state ---
const selectedClientId = ref<string | null>(null);
const selectedClinicId = ref<string | null>(null);
const statsLoading = ref(false);

function createEmptyQueueStats(): QueueStats {
  return {
    PENDING: 0,
    POLLING: 0,
    EXTRACTING: 0,
    EXECUTING: 0,
    DONE: 0,
    FAILED: 0,
    EXTRACTED: 0,
    EXECUTED: 0,
    PARTIAL: 0,
    NO_APPOINTMENT: 0,
    RETRY_DEFERRED: 0,
    BLOCKED_ECONNECTOR: 0,
    SHEETS_RETRYING: 0,
    SYNCING: 0,
    SYNCED: 0,
    EXTRACT_FAILED: 0,
    SYNC_FAILED: 0,
    total: 0,
  };
}

// --- Clinic dropdown items (includes "All Clinics") ---
const clinicSelectItems = computed(() => {
  const items: { title: string; value: string | null }[] = [
    { title: 'All Clinics', value: null },
  ];
  for (const c of clinics.value) {
    items.push({ title: c.clinic_name, value: c.id });
  }
  return items;
});

// --- Aggregate stats based on scope ---
const scopedStats = computed<QueueStats>(() => {
  // Single clinic selected → use its stats directly
  if (selectedClinicId.value && clinicStatsMap.value[selectedClinicId.value]) {
    return clinicStatsMap.value[selectedClinicId.value];
  }

  // Client selected w/ "All Clinics" → aggregate from clinicStatsMap
  if (selectedClientId.value && clinics.value.length > 0) {
    const agg = createEmptyQueueStats();
    for (const clinic of clinics.value) {
      const cs = clinicStatsMap.value[clinic.id];
      if (cs) {
        for (const key of Object.keys(agg) as Array<keyof QueueStats>) {
          agg[key] += cs[key] ?? 0;
        }
      }
    }
    return agg;
  }

  // No selection → global stats
  return queueStats.value;
});

// --- Stat cards config ---
const statsCards = computed(() => [
  {
    title: 'Pending',
    value: scopedStats.value.PENDING,
    subtitle: 'Waiting in queue',
    color: 'warning' as const,
    icon: ClockIcon,
  },
  {
    title: 'Active',
    value:
      scopedStats.value.POLLING +
      scopedStats.value.EXTRACTING +
      scopedStats.value.EXECUTING,
    subtitle: 'Currently processing',
    color: 'primary' as const,
    icon: LoaderIcon,
  },
  {
    title: 'Done',
    value: scopedStats.value.DONE,
    subtitle: 'Successfully written back',
    color: 'success' as const,
    icon: CircleCheckIcon,
  },
  {
    title: 'Failed',
    value: scopedStats.value.FAILED,
    subtitle: 'Errors requiring attention',
    color: 'error' as const,
    icon: AlertCircleIcon,
  },
]);

// --- Clinic health table rows ---
const clinicHealthRows = computed(() =>
  clinics.value.map((c) => ({
    clinicId: c.id,
    clinicName: c.clinic_name,
    stats: clinicStatsMap.value[c.id] ?? createEmptyQueueStats(),
  }))
);

// --- Fetch per-clinic stats in parallel ---
let statsRefreshInFlight: Promise<void> | null = null;

async function fetchAllClinicStats() {
  if (clinics.value.length === 0) return;
  if (statsRefreshInFlight) return statsRefreshInFlight;

  const refreshRequest = (async () => {
    statsLoading.value = true;
    try {
      await Promise.all(
        clinics.value.map((c) => writebackStore.fetchClinicStats(c.id))
      );
    } finally {
      statsLoading.value = false;
    }
  })();

  const trackedRequest = refreshRequest.finally(() => {
    if (statsRefreshInFlight === trackedRequest) {
      statsRefreshInFlight = null;
    }
  });
  statsRefreshInFlight = trackedRequest;
  return trackedRequest;
}

// --- Refresh handler ---
async function refresh() {
  statsLoading.value = true;
  try {
    if (selectedClientId.value) {
      await clinicStore.fetchClinics(selectedClientId.value);
      await fetchAllClinicStats();
    } else {
      await writebackStore.fetchQueueStats();
    }
  } finally {
    statsLoading.value = false;
  }
}

// --- Watchers ---
watch(selectedClientId, async (newVal) => {
  selectedClinicId.value = null;
  if (newVal) {
    await clinicStore.fetchClinics(newVal);
    await fetchAllClinicStats();
  } else {
    clinics.value = [];
  }
});

watch(selectedClinicId, async (newVal) => {
  if (newVal) {
    statsLoading.value = true;
    try {
      await writebackStore.fetchClinicStats(newVal);
    } finally {
      statsLoading.value = false;
    }
  }
});

// --- Auto-refresh ---
let refreshInterval: ReturnType<typeof setInterval> | null = null;

function refreshVisibleStats() {
  if (document.visibilityState !== 'visible') return;

  if (selectedClientId.value) {
    void fetchAllClinicStats();
  } else {
    void writebackStore.fetchQueueStats();
  }
}

onMounted(async () => {
  clientStore.fetchClients();
  await writebackStore.fetchQueueStats();
  refreshInterval = setInterval(refreshVisibleStats, 10000);
  document.addEventListener('visibilitychange', refreshVisibleStats);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  document.removeEventListener('visibilitychange', refreshVisibleStats);
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />

  <v-row>
    <!-- Filter Bar -->
    <v-col cols="12">
      <v-card variant="flat" class="rounded-lg">
        <v-card-text class="d-flex align-center ga-4 flex-wrap">
          <v-select
            v-model="selectedClientId"
            :items="clients"
            item-title="client_name"
            item-value="id"
            label="Client"
            variant="outlined"
            color="primary"
            hide-details
            density="compact"
            clearable
            placeholder="All Clients (Global)"
            style="max-width: 300px"
          />
          <v-select
            v-model="selectedClinicId"
            :items="clinicSelectItems"
            item-title="title"
            item-value="value"
            label="Clinic"
            variant="outlined"
            color="primary"
            hide-details
            density="compact"
            :disabled="!selectedClientId"
            placeholder="All Clinics"
            style="max-width: 300px"
          />
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            icon
            size="small"
            :loading="statsLoading"
            @click="refresh"
          >
            <RefreshIcon size="18" stroke-width="1.5" />
          </v-btn>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Stat Cards -->
    <v-col v-for="(card, index) in statsCards" :key="index" cols="12" sm="6" lg="3">
      <v-skeleton-loader v-if="statsLoading" type="card" />
      <StatCard
        v-else
        :title="card.title"
        :value="card.value"
        :subtitle="card.subtitle"
        :color="card.color"
        :icon="card.icon"
      />
    </v-col>

    <!-- Clinic Health Table + Pipeline Distribution -->
    <v-col v-if="selectedClientId" cols="12" lg="7">
      <UiParentCard title="Clinic Health">
        <ClinicHealthTable :rows="clinicHealthRows" :loading="statsLoading || clinicsLoading" />
      </UiParentCard>
    </v-col>

    <v-col :cols="12" :lg="selectedClientId ? 5 : 12">
      <UiParentCard title="Pipeline Distribution">
        <template #action>
          <v-chip color="primary" variant="tonal" size="small">
            Total: {{ scopedStats.total }}
          </v-chip>
        </template>
        <PipelineDistribution :stats="scopedStats" />
      </UiParentCard>
    </v-col>

    <!-- Live Activity Feed -->
    <v-col cols="12">
      <UiParentCard title="Recent Activity">
        <template #action>
          <v-btn color="primary" variant="tonal" size="small" to="/writeback/live">
            <ActivityIcon size="16" stroke-width="1.5" class="mr-1" />
            View Live Activity
          </v-btn>
        </template>
        <LiveActivityFeed :client-id="selectedClientId" :clinic-id="selectedClinicId" />
      </UiParentCard>
    </v-col>
  </v-row>
</template>
