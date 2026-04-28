<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import {
  RefreshIcon,
  BuildingIcon,
  AlertTriangleIcon,
  EyeIcon,
  PlayerPlayIcon,
} from 'vue-tabler-icons';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useWritebackStore } from '@/stores/writeback';
import { useClientStore } from '@/stores/clients';
import { useClinicStore } from '@/stores/clinics';
import type { QueueStats, PreviewReadyRow, SyncSelection } from '@/types/writeback';

const writebackStore = useWritebackStore();
const clientStore = useClientStore();
const clinicStore = useClinicStore();

const { clients } = storeToRefs(clientStore);
const { clinics } = storeToRefs(clinicStore);
const { clinicStatsMap, circuitBreakerStatuses } = storeToRefs(writebackStore);

const filterClientId = ref<string | undefined>(undefined);
const syncResult = ref<{ clinic_id: string; message: string } | null>(null);

// Per-clinic writeback config and ready rows
const clinicConfigMap = ref<Record<string, any>>({});
const clinicReadyCountMap = ref<Record<string, number>>({});

// Preview dialog state
const previewDialog = ref(false);
const previewClinicId = ref<string | null>(null);
const previewClinicName = ref('');
const previewRows = ref<PreviewReadyRow[]>([]);
const previewLoading = ref(false);
const selectedRows = ref<PreviewReadyRow[]>([]);
const syncingSelected = ref(false);
const filterSheetTab = ref<string | undefined>(undefined);
const previewSnapshotToken = ref<string | null>(null);
const previewGeneratedAt = ref<string | null>(null);

// Preview table headers
const previewHeaders = [
  { title: '#', key: 'row_index', sortable: true, width: '60px' },
  { title: 'Patient', key: 'patient_name', sortable: true },
  { title: 'Appt Date', key: 'sheet_tab', sortable: true, width: '130px' },
  { title: 'Profile', key: 'matched_profile', sortable: false, width: '200px' },
  { title: 'Verification', key: 'verification_type', sortable: false, width: '110px' },
  { title: 'Status', key: 'verification_status', sortable: false, width: '140px' },
  { title: 'Audit', key: 'audit_status', sortable: false, width: '100px' },
];

// Computed: unique sheet tabs for filter
const uniqueSheetTabs = computed(() =>
  [...new Set(previewRows.value.map((r) => r.sheet_tab).filter(Boolean))].sort()
);

// Computed: filtered preview rows
const filteredPreviewRows = computed(() =>
  filterSheetTab.value
    ? previewRows.value.filter((r) => r.sheet_tab === filterSheetTab.value)
    : previewRows.value
);

// Computed: selection summary
const selectedInFilterCount = computed(() => {
  const visibleKeys = new Set(filteredPreviewRows.value.map((r) => r.selection_key));
  return selectedRows.value.filter((r) => visibleKeys.has(r.selection_key)).length;
});

const selectionSummary = computed(() => {
  const total = filteredPreviewRows.value.length;
  const selected = selectedInFilterCount.value;
  return `${total} rows ready (${selected} selected)`;
});

// Load clinics when client changes, then fetch per-clinic stats + configs
async function onClientChange(clientId: string | undefined) {
  if (clientId) {
    await clinicStore.fetchClinics(clientId);
    // Fetch stats + configs only (avoid multi-clinic preview prefetch load)
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
      }),
    ]);
  }
}

// Helper to get stats for a specific clinic
function getClinicStats(clinicId: string): QueueStats {
  return clinicStatsMap.value[clinicId] || {
    PENDING: 0,
    POLLING: 0,
    EXTRACTING: 0,
    EXECUTING: 0,
    DONE: 0,
    FAILED: 0,
    EXTRACTED: 0,
    EXECUTED: 0,
    PARTIAL: 0,
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

function getMode(clinicId: string): string {
  return clinicConfigMap.value[clinicId]?.writeback_mode || 'manual';
}

function getReadyCount(clinicId: string): number {
  return clinicReadyCountMap.value[clinicId] ?? 0;
}

function isQuietHours(clinicId: string): boolean {
  const cfg = clinicConfigMap.value[clinicId];
  if (!cfg || cfg.writeback_mode !== 'automatic') return false;
  return !!(cfg.quiet_start && cfg.quiet_end);
}

function getWatchHealth(clinicId: string) {
  return clinicConfigMap.value[clinicId]?.watch_health ?? {
    status: 'none',
    expires_at: null,
    automatic_healthy: false,
  };
}

function showWatchHealthChip(clinicId: string): boolean {
  return getMode(clinicId) === 'automatic';
}

function watchHealthColor(clinicId: string): string {
  const status = getWatchHealth(clinicId).status;
  if (status === 'active') return 'success';
  if (status === 'expiring_soon') return 'warning';
  if (status === 'expired' || status === 'none') return 'error';
  return 'secondary';
}

function watchHealthLabel(clinicId: string): string {
  const status = getWatchHealth(clinicId).status;
  if (status === 'active') return 'Watch Active';
  if (status === 'expiring_soon') return 'Watch Expiring Soon';
  if (status === 'expired') return 'Watch Expired';
  return 'No Watch';
}

function automaticHealthLabel(clinicId: string): string {
  const mode = getMode(clinicId);
  if (mode !== 'automatic') return 'Manual mode';
  return getWatchHealth(clinicId).automatic_healthy ? 'Automatic Healthy' : 'Automatic Degraded';
}

function automaticHealthColor(clinicId: string): string {
  const mode = getMode(clinicId);
  if (mode !== 'automatic') return 'info';
  return getWatchHealth(clinicId).automatic_healthy ? 'success' : 'error';
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

// Open preview dialog
async function handlePreview(clinic: any) {
  previewClinicId.value = clinic.id;
  previewClinicName.value = clinic.clinic_name;
  previewLoading.value = true;
  previewDialog.value = true;
  filterSheetTab.value = undefined;
  selectedRows.value = [];
  previewRows.value = [];
  previewSnapshotToken.value = null;
  previewGeneratedAt.value = null;

  try {
    const rows = await writebackStore.previewReadyRows(clinic.id);
    previewRows.value = Array.isArray(rows) ? rows : [];
    clinicReadyCountMap.value[clinic.id] = previewRows.value.length;
    previewSnapshotToken.value = previewRows.value[0]?.preview_snapshot_token ?? null;
    previewGeneratedAt.value = previewRows.value[0]?.preview_generated_at ?? null;
    // Select all by default
    selectedRows.value = [...previewRows.value];
  } catch {
    previewRows.value = [];
    clinicReadyCountMap.value[clinic.id] = 0;
  } finally {
    previewLoading.value = false;
  }
}

// Sync selected rows
async function handleSyncSelected() {
  if (!previewClinicId.value || selectedRows.value.length === 0) return;
  syncingSelected.value = true;
  try {
    const selections: SyncSelection[] = selectedRows.value.map((r) => ({
      row_index: r.row_index,
      sheet_tab: r.sheet_tab || '',
      selection_key: r.selection_key,
      patient_name: r.patient_name,
    }));

    const result = await writebackStore.syncClinic(previewClinicId.value, {
      selections,
      preview_snapshot_token: previewSnapshotToken.value,
      preview_generated_at: previewGeneratedAt.value,
      preview_rows_found: previewRows.value.length,
    });
    syncResult.value = {
      clinic_id: previewClinicId.value,
      message: `Sync complete: ${result?.jobs_created ?? 0} created, ${result?.jobs_deduplicated ?? 0} deduplicated`,
    };
    // Refresh this clinic's stats and ready count
    await writebackStore.fetchClinicStats(previewClinicId.value);
    try {
      const rows = await writebackStore.previewReadyRows(previewClinicId.value);
      clinicReadyCountMap.value[previewClinicId.value] = Array.isArray(rows) ? rows.length : 0;
    } catch { /* ignore */ }
    previewDialog.value = false;
  } catch (err: any) {
    const text = String(err || 'Unknown error');
    const stale = text.toLowerCase().includes('stale') || text.toLowerCase().includes('inconsistent');
    syncResult.value = {
      clinic_id: previewClinicId.value!,
      message: stale
        ? `Preview desactualizada: ${text}. Refrescá Preview Rows y volvé a sincronizar.`
        : `Sync failed: ${text}`,
    };
  } finally {
    syncingSelected.value = false;
  }
}

function profileColor(profile: string | null): string {
  if (!profile || profile === 'No match') return 'error';
  return 'success';
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
                    v-if="showWatchHealthChip(clinic.id)"
                    :color="watchHealthColor(clinic.id)"
                    variant="tonal"
                    size="x-small"
                  >
                    {{ watchHealthLabel(clinic.id) }}
                  </v-chip>
                  <v-chip
                    :color="automaticHealthColor(clinic.id)"
                    variant="tonal"
                    size="x-small"
                  >
                    {{ automaticHealthLabel(clinic.id) }}
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
                  <span class="text-disabled"> (on-demand)</span>
                </div>

                <!-- Info list -->
                <div class="text-caption text-medium-emphasis mb-1">
                  Status: <strong :class="`text-${clinic.is_active ? 'success' : 'error'}`">
                    {{ clinic.is_active ? 'Active' : 'Inactive' }}
                  </strong>
                </div>

                <!-- Preview Rows button -->
                <v-btn
                  color="primary"
                  :variant="getReadyCount(clinic.id) > 0 ? 'flat' : 'tonal'"
                  size="small"
                  block
                  class="mt-3"
                  :disabled="!clinic.is_active"
                  @click="handlePreview(clinic)"
                >
                  <EyeIcon size="16" class="mr-1" />
                  Preview Rows
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

  <!-- Preview Dialog -->
  <v-dialog v-model="previewDialog" max-width="1100" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h6">
          <EyeIcon size="20" class="mr-2" />
          Preview — {{ previewClinicName }}
        </span>
        <v-chip color="primary" variant="tonal" size="small">
          {{ selectionSummary }}
        </v-chip>
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Sheet tab filter -->
        <div class="d-flex align-center ga-3 mb-3">
          <v-select
            v-model="filterSheetTab"
            :items="uniqueSheetTabs"
            label="Filter by Appointment Date"
            clearable
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 250px"
          />
        </div>

        <!-- Loading spinner -->
        <v-progress-circular
          v-if="previewLoading"
          indeterminate
          color="primary"
          class="d-block mx-auto my-8"
        />

        <!-- Empty state -->
        <v-alert
          v-else-if="previewRows.length === 0"
          type="info"
          variant="tonal"
          class="my-4"
        >
          No ready rows found for this clinic.
        </v-alert>

        <!-- Data table -->
        <v-data-table
          v-else
          v-model="selectedRows"
          :headers="previewHeaders"
          :items="filteredPreviewRows"
          item-value="selection_key"
          show-select
          return-object
          density="compact"
          class="rounded-lg"
          :items-per-page="-1"
          hide-default-footer
        >
          <!-- Profile chip -->
          <template #item.matched_profile="{ item }">
            <v-chip
              :color="profileColor(item.matched_profile)"
              variant="tonal"
              size="small"
            >
              {{ item.matched_profile || 'No match' }}
            </v-chip>
          </template>

          <!-- Verification type chip -->
          <template #item.verification_type="{ item }">
            <v-chip
              v-if="item.verification_type"
              color="info"
              variant="tonal"
              size="x-small"
            >
              {{ item.verification_type }}
            </v-chip>
          </template>

          <!-- Audit status -->
          <template #item.audit_status="{ item }">
            <span class="text-caption">{{ item.audit_status }}</span>
          </template>
        </v-data-table>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="previewDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="syncingSelected"
          :disabled="selectedRows.length === 0"
          @click="handleSyncSelected"
        >
          <PlayerPlayIcon size="16" class="mr-1" />
          Sync Selected ({{ selectedRows.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
