<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useExtractionStore } from '@/stores/extraction';
import {
  ActivityIcon,
  CircleCheckIcon,
  SettingsIcon,
  CalendarStatsIcon,
  PlayerPlayIcon,
  RefreshIcon,
} from 'vue-tabler-icons';

const extractionStore = useExtractionStore();
const { runs, recentRuns, schedules, dashboardSummary, clinicNameMap, loading, error } = storeToRefs(extractionStore);
const { hydrateLookups, fetchRuns, fetchSchedules, triggerExtraction, statusColor } = extractionStore;

const triggerDialog = ref(false);
const triggerLoading = ref(false);
const triggerError = ref('');

const triggerForm = ref({
  clinic_id: '',
  run_type: 'NEW_DATE' as 'NEW_DATE' | 'REVIEW',
  date_from: '',
  date_to: '',
});

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref<'success' | 'error' | 'warning'>('success');

const clinicItems = computed(() =>
  Object.entries(clinicNameMap.value).map(([value, title]) => ({ value, title })),
);

const headers = [
  { title: 'Clinic', key: 'clinic_id', sortable: false },
  { title: 'Type', key: 'run_type', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Target Date', key: 'target_date', sortable: false },
  { title: 'Rows', key: 'inserted_rows_count', align: 'end' as const },
  { title: 'Started', key: 'started_at', sortable: false },
];

function clinicName(clinicId: string): string {
  return clinicNameMap.value[clinicId] || `${clinicId.slice(0, 8)}…`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function refreshDashboard() {
  await Promise.all([
    fetchRuns({ page: 1, per_page: 20 }),
    fetchSchedules(),
  ]);
}

function openTriggerDialog() {
  triggerForm.value = {
    clinic_id: '',
    run_type: 'NEW_DATE',
    date_from: '',
    date_to: '',
  };
  triggerError.value = '';
  triggerDialog.value = true;
}

async function onTrigger() {
  if (triggerLoading.value) return;

  if (!triggerForm.value.clinic_id || !triggerForm.value.date_from || !triggerForm.value.date_to) {
    triggerError.value = 'Clinic and date range are required.';
    return;
  }

  if (new Date(triggerForm.value.date_to) < new Date(triggerForm.value.date_from)) {
    triggerError.value = 'Invalid date range. End date cannot be before start date.';
    return;
  }

  triggerLoading.value = true;
  triggerError.value = '';

  try {
    const result = await triggerExtraction(
      triggerForm.value.clinic_id,
      triggerForm.value.run_type,
      triggerForm.value.date_from,
      triggerForm.value.date_to,
    );

    snackbarText.value =
      result?.message || result?.data?.message || 'Extraction triggered successfully.';
    snackbarColor.value = 'success';
    triggerDialog.value = false;
    await refreshDashboard();
  } catch (err: any) {
    snackbarText.value = err || 'Failed to trigger extraction.';
    snackbarColor.value = 'error';
  } finally {
    triggerLoading.value = false;
    snackbar.value = true;
  }
}

onMounted(async () => {
  await hydrateLookups();
  await refreshDashboard();
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Extraction Dashboard">
        <template #action>
          <div class="d-flex ga-2">
            <v-btn color="secondary" variant="tonal" size="small" @click="refreshDashboard">
              <RefreshIcon size="16" class="mr-1" stroke-width="1.5" />
              Refresh
            </v-btn>
            <v-btn color="primary" variant="flat" :loading="triggerLoading" @click="openTriggerDialog">
              <PlayerPlayIcon size="16" class="mr-1" stroke-width="1.5" />
              Manual Trigger
            </v-btn>
          </div>
        </template>

        <v-row>
          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Total Runs">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightprimary mr-3" rounded>
                  <ActivityIcon size="22" class="text-primary" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold">{{ dashboardSummary.total_runs }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Runs in current view</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>

          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Success Rate">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightsuccess mr-3" rounded>
                  <CircleCheckIcon size="22" class="text-success" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold text-success">{{ dashboardSummary.success_rate }}%</h3>
                  <span class="text-body-2 text-medium-emphasis">Completed runs</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>

          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Active Schedules">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightwarning mr-3" rounded>
                  <SettingsIcon size="22" class="text-warning" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold text-warning">{{ dashboardSummary.active_schedules }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Auto extraction enabled</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>

          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Appointments Today">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightinfo mr-3" rounded>
                  <CalendarStatsIcon size="22" class="text-info" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold">{{ dashboardSummary.appointments_today }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Rows inserted</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <UiParentCard title="Recent Runs">
              <v-alert
                v-if="!loading && !recentRuns.length"
                type="info"
                variant="tonal"
                closable
                class="mb-4"
              >
                No extraction runs found. Trigger a run to populate this table.
              </v-alert>

              <v-data-table
                :headers="headers"
                :items="recentRuns"
                :loading="loading"
                item-value="id"
                density="comfortable"
              >
                <template #item.clinic_id="{ item }">
                  <span class="font-weight-medium">{{ clinicName(item.clinic_id) }}</span>
                </template>

                <template #item.status="{ item }">
                  <v-chip :color="statusColor(item.status)" size="small" variant="flat">
                    {{ item.status }}
                  </v-chip>
                </template>

                <template #item.started_at="{ item }">
                  {{ formatDate(item.started_at) }}
                </template>
              </v-data-table>
            </UiParentCard>
          </v-col>
        </v-row>
      </UiParentCard>
    </v-col>
  </v-row>

  <v-dialog v-model="triggerDialog" max-width="560">
    <v-card>
      <v-card-title class="text-h6">Manual Extraction Trigger</v-card-title>
      <v-card-text>
        <v-alert v-if="triggerError" type="error" variant="tonal" closable class="mb-4">
          {{ triggerError }}
        </v-alert>

        <v-form>
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="triggerForm.clinic_id"
                :items="clinicItems"
                item-title="title"
                item-value="value"
                label="Clinic"
                variant="outlined"
                color="primary"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="triggerForm.run_type"
                :items="[{ title: 'New Date', value: 'NEW_DATE' }, { title: 'Review', value: 'REVIEW' }]"
                item-title="title"
                item-value="value"
                label="Run Type"
                variant="outlined"
                color="primary"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="triggerForm.date_from"
                type="date"
                label="Date From"
                variant="outlined"
                color="primary"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="triggerForm.date_to"
                type="date"
                label="Date To"
                variant="outlined"
                color="primary"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="tonal" color="secondary" @click="triggerDialog = false">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="triggerLoading" @click="onTrigger">
          Trigger
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarText }}
  </v-snackbar>

  <v-row v-if="error">
    <v-col cols="12">
      <v-alert type="error" variant="tonal" closable>
        {{ error }}
      </v-alert>
    </v-col>
  </v-row>
</template>
