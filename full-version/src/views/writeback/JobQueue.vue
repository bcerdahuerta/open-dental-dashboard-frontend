<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import {
  RefreshIcon,
  BuildingIcon,
  AlertTriangleIcon,
} from 'vue-tabler-icons';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useWritebackStore } from '@/stores/writeback';
import { useClientStore } from '@/stores/clients';
import { useClinicStore } from '@/stores/clinics';
import type { QueueStats } from '@/types/writeback';

const writebackStore = useWritebackStore();
const clientStore = useClientStore();
const clinicStore = useClinicStore();

const { clients } = storeToRefs(clientStore);
const { clinics } = storeToRefs(clinicStore);
const { clinicStatsMap, circuitBreakerStatuses } = storeToRefs(writebackStore);

const filterClientId = ref<string | undefined>(undefined);
const syncingClinicId = ref<string | null>(null);
const syncResult = ref<{ clinic_id: string; message: string } | null>(null);

// Per-clinic writeback config and ready rows
const clinicConfigMap = ref<Record<string, any>>({});
const clinicReadyCountMap = ref<Record<string, number>>({});

// Load clinics when client changes, then fetch per-clinic stats + configs
async function onClientChange(clientId: string | undefined) {
  if (clientId) {
    await clinicStore.fetchClinics(clientId);
    // Fetch stats, configs, ready rows, and circuit breaker for each clinic (parallel)
    await Promise.all([
      writebackStore.fetchCircuitBreakerStatus(),
      ...clinicStore.clinics.map(async (c: any) => {
        await writebackStore.fetchClinicStats(c.id);
        try {
          const cfg = await writebackStore.fetchWritebackConfig(c.id);
          clinicConfigMap.value[c.id] = cfg;
        } catch {
          clinicConfigMap.value[c.id] = { writeback_mode: 'manual' };
        }
        try {
          const rows = await writebackStore.previewReadyRows(c.id);
          clinicReadyCountMap.value[c.id] = Array.isArray(rows) ? rows.length : 0;
        } catch {
          clinicReadyCountMap.value[c.id] = 0;
        }
      }),
    ]);
  }
}

// Helper to get stats for a specific clinic
function getClinicStats(clinicId: string): QueueStats {
  return clinicStatsMap.value[clinicId] || {
    PENDING: 0, POLLING: 0, EXTRACTING: 0, EXECUTING: 0, DONE: 0, FAILED: 0, total: 0,
  };
}

function getMode(clinicId: string): string {
  return clinicConfigMap.value[clinicId]?.writeback_mode || 'manual';
}

function getReadyCount(clinicId: string): number {
  return clinicReadyCountMap.value[clinicId] || 0;
}

function isQuietHours(clinicId: string): boolean {
  const cfg = clinicConfigMap.value[clinicId];
  if (!cfg || cfg.writeback_mode !== 'automatic') return false;
  // We can't compute quiet hours client-side perfectly but we show the chip if quiet hours are configured
  return !!(cfg.quiet_start && cfg.quiet_end);
}

// Traffic light color based on per-clinic stats + circuit breaker
function trafficLightColor(clinic: any): string {
  const cb = circuitBreakerStatuses.value[clinic.id];
  if (cb && cb.state === 'OPEN') return 'error';
  if (cb && cb.state === 'HALF_OPEN') return 'warning';
  const stats = getClinicStats(clinic.id);
  if (stats.FAILED > 0) return 'error';
  if (stats.PENDING > 0 || stats.POLLING > 0 || stats.EXTRACTING > 0 || stats.EXECUTING > 0) return 'warning';
  return 'success';
}

function trafficLightLabel(clinic: any): string {
  const cb = circuitBreakerStatuses.value[clinic.id];
  if (cb && cb.state === 'OPEN') return 'API Down';
  if (cb && cb.state === 'HALF_OPEN') return 'Recovering';
  const stats = getClinicStats(clinic.id);
  if (stats.FAILED > 0) return `${stats.FAILED} failed`;
  if (stats.PENDING > 0) return `${stats.PENDING} pending`;
  const active = stats.POLLING + stats.EXTRACTING + stats.EXECUTING;
  if (active > 0) return `${active} active`;
  if (stats.DONE > 0) return `${stats.DONE} done`;
  return 'No jobs';
}

async function handleSync(clinicId: string) {
  syncingClinicId.value = clinicId;
  syncResult.value = null;
  try {
    const result = await writebackStore.syncClinic(clinicId);
    syncResult.value = {
      clinic_id: clinicId,
      message: `Sync complete: ${result?.jobs_created ?? 0} jobs enqueued`,
    };
    // Refresh this clinic's stats and ready count
    await writebackStore.fetchClinicStats(clinicId);
    try {
      const rows = await writebackStore.previewReadyRows(clinicId);
      clinicReadyCountMap.value[clinicId] = Array.isArray(rows) ? rows.length : 0;
    } catch { /* ignore */ }
  } catch (err: any) {
    syncResult.value = {
      clinic_id: clinicId,
      message: `Sync failed: ${err}`,
    };
  } finally {
    syncingClinicId.value = null;
  }
}

onMounted(() => {
  clientStore.fetchClients();
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Job Queue — Clinic Health">
        <!-- Client filter -->
        <div class="d-flex align-center ga-3 mb-4">
          <v-select
            v-model="filterClientId"
            :items="clients"
            item-title="client_name"
            item-value="id"
            label="Filter by Client"
            variant="outlined"
            color="primary"
            density="compact"
            hide-details="auto"
            clearable
            style="max-width: 300px"
            @update:model-value="onClientChange"
          />
        </div>

        <!-- Sync result banner -->
        <v-alert
          v-if="syncResult"
          :type="syncResult.message.includes('failed') ? 'error' : 'success'"
          variant="tonal"
          density="compact"
          closable
          class="mb-4"
          @click:close="syncResult = null"
        >
          {{ syncResult.message }}
        </v-alert>

        <!-- Empty state -->
        <v-alert
          v-if="filterClientId && clinics.length === 0"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          No clinics found for this client. Select a different client or add clinics first.
        </v-alert>

        <!-- Clinic cards grid -->
        <v-row v-if="filterClientId && clinics.length > 0">
          <v-col
            v-for="clinic in clinics"
            :key="clinic.id"
            cols="12"
            sm="6"
            lg="3"
          >
            <v-card variant="outlined" class="pa-0">
              <v-card-text>
                <!-- Header: name + traffic light -->
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center ga-2">
                    <v-avatar :color="trafficLightColor(clinic)" size="12" />
                    <span class="text-subtitle-1 font-weight-bold">
                      {{ clinic.clinic_name }}
                    </span>
                  </div>
                </div>

                <!-- Mode + status badges -->
                <div class="d-flex flex-wrap ga-1 mb-3">
                  <v-chip
                    :color="getMode(clinic.id) === 'automatic' ? 'success' : 'info'"
                    variant="tonal"
                    size="x-small"
                  >
                    {{ getMode(clinic.id) === 'automatic' ? 'Auto' : 'Manual' }}
                  </v-chip>
                  <v-chip
                    :color="trafficLightColor(clinic)"
                    variant="tonal"
                    size="x-small"
                  >
                    {{ trafficLightLabel(clinic) }}
                  </v-chip>
                  <v-chip
                    v-if="isQuietHours(clinic.id)"
                    color="warning"
                    variant="tonal"
                    size="x-small"
                  >
                    Quiet Hours
                  </v-chip>
                </div>

                <!-- Circuit Breaker Alert -->
                <v-alert
                  v-if="circuitBreakerStatuses[clinic.id] && circuitBreakerStatuses[clinic.id].state !== 'CLOSED'"
                  :type="circuitBreakerStatuses[clinic.id].state === 'OPEN' ? 'error' : 'warning'"
                  variant="tonal"
                  density="compact"
                  class="mb-2"
                >
                  <template #prepend>
                    <AlertTriangleIcon size="16" />
                  </template>
                  <div class="text-caption">
                    <strong>OD API {{ circuitBreakerStatuses[clinic.id].state === 'OPEN' ? 'Unavailable' : 'Recovering' }}</strong>
                    <span class="text-medium-emphasis ml-1">
                      ({{ circuitBreakerStatuses[clinic.id].failures }} failures<span v-if="circuitBreakerStatuses[clinic.id].seconds_until_reset > 0">, resets in {{ circuitBreakerStatuses[clinic.id].seconds_until_reset }}s</span>)
                    </span>
                  </div>
                </v-alert>

                <!-- Ready rows count -->
                <div class="text-caption text-medium-emphasis mb-1">
                  Ready rows: <strong class="text-primary">{{ getReadyCount(clinic.id) }}</strong>
                </div>

                <!-- Info list -->
                <div class="text-caption text-medium-emphasis mb-1">
                  Status: <strong :class="`text-${clinic.is_active ? 'success' : 'error'}`">
                    {{ clinic.is_active ? 'Active' : 'Inactive' }}
                  </strong>
                </div>

                <!-- Sync Now button -->
                <v-btn
                  :color="getMode(clinic.id) === 'manual' && getReadyCount(clinic.id) > 0 ? 'primary' : 'primary'"
                  :variant="getMode(clinic.id) === 'manual' && getReadyCount(clinic.id) > 0 ? 'flat' : 'tonal'"
                  size="small"
                  block
                  class="mt-3"
                  :loading="syncingClinicId === clinic.id"
                  :disabled="!clinic.is_active"
                  @click="handleSync(clinic.id)"
                >
                  <RefreshIcon size="16" class="mr-1" />
                  Sync Now
                  <v-badge
                    v-if="getReadyCount(clinic.id) > 0"
                    :content="getReadyCount(clinic.id)"
                    color="error"
                    inline
                    class="ml-2"
                  />
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Prompt to select client -->
        <div
          v-if="!filterClientId"
          class="d-flex flex-column align-center justify-center py-12 text-medium-emphasis"
        >
          <BuildingIcon size="48" stroke-width="1" class="mb-3 text-disabled" />
          <span class="text-body-1">Select a client above to view clinic health</span>
        </div>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
