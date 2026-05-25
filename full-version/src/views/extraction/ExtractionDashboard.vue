<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useExtractionStore } from '@/stores/extraction';
import { useRobotStore } from '@/stores/robot';
import { useClientStore } from '@/stores/clients';
import { useClinicStore } from '@/stores/clinics';
import {
  ActivityIcon,
  CircleCheckIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  SettingsIcon,
  CalendarStatsIcon,
  PlayerPlayIcon,
  RefreshIcon,
} from 'vue-tabler-icons';

const extractionStore = useExtractionStore();
const robotStore = useRobotStore();
const clientStore = useClientStore();
const clinicStore = useClinicStore();

const { clinicNameMap, loading, error, events, schedules, runs, health } = storeToRefs(extractionStore);
const { healthyCount: robotHealthyCount, staleCount: robotStaleCount, totalCount: robotTotalCount } = storeToRefs(robotStore);
const { clients } = storeToRefs(clientStore);
const { clinics } = storeToRefs(clinicStore);
const { hydrateLookups, fetchRuns, fetchSchedules, fetchHealth, fetchEvents, triggerExtraction, statusColor } = extractionStore;
const { fetchWorkstations } = robotStore;

const triggerDialog = ref(false);
const triggerLoading = ref(false);
const triggerError = ref('');
const selectedClientId = ref('');

const triggerForm = ref({
  clinic_id: '',
  run_type: 'NEW_DATE' as 'NEW_DATE' | 'REVIEW',
  date_from: '',
  date_to: '',
});

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref<'success' | 'error' | 'warning'>('success');

const clientItems = computed(() => [{ value: '', title: 'All Clients' }, ...clients.value.map((client) => ({
  value: client.id,
  title: client.client_name,
}))]);

const selectedClientClinicIds = computed(() => clinics.value
  .filter((clinic) => !selectedClientId.value || clinic.client_id === selectedClientId.value)
  .map((clinic) => clinic.id));

const clinicItems = computed(() => clinics.value
  .filter((clinic) => !selectedClientId.value || clinic.client_id === selectedClientId.value)
  .map((clinic) => ({ value: clinic.id, title: clinic.clinic_name })));

const filteredRuns = computed(() => {
  if (!selectedClientId.value) return runs.value;
  const allowed = new Set(selectedClientClinicIds.value);
  return runs.value.filter((run) => allowed.has(run.clinic_id));
});

const filteredSchedules = computed(() => {
  if (!selectedClientId.value) return schedules.value;
  const allowed = new Set(selectedClientClinicIds.value);
  return schedules.value.filter((schedule) => allowed.has(schedule.clinic_id));
});

const filteredHealth = computed(() => {
  if (!selectedClientId.value) return health.value;
  const allowed = new Set(selectedClientClinicIds.value);
  return health.value.filter((item) => allowed.has(item.clinic_id));
});

const filteredEvents = computed(() => {
  if (!selectedClientId.value) return events.value;
  const allowed = new Set(selectedClientClinicIds.value);
  return events.value.filter((item) => allowed.has(item.clinic_id));
});

const dashboardSummary = computed(() => {
  const totalRuns = filteredRuns.value.length;
  const completedRuns = filteredRuns.value.filter((run) => run.status === 'COMPLETED').length;

  return {
    total_runs: totalRuns,
    success_rate: totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0,
    active_schedules: filteredSchedules.value.filter((schedule) => schedule.auto_extract_enabled).length,
    appointments_today: filteredRuns.value.reduce((sum, run) => sum + (run.inserted_rows_count || 0), 0),
  };
});

const healthSummary = computed(() => ({
  healthy: filteredHealth.value.filter((item) => item.status === 'HEALTHY').length,
  degraded: filteredHealth.value.filter((item) => item.status === 'DEGRADED').length,
  down: filteredHealth.value.filter((item) => item.status === 'DOWN').length,
  notification_backlog: filteredHealth.value.reduce((sum, item) => sum + item.pending_notification_count + item.failed_notification_count, 0),
}));

const slackConfiguredCount = computed(() => filteredSchedules.value.filter((item) => Boolean(item.effective_policy?.slack_webhook ?? item.slack_webhook)).length);
const explicitWeekdayCount = computed(() => filteredSchedules.value.filter((item) => (item.effective_policy?.working_days ?? item.working_days ?? []).length > 0).length);
const policySnapshot = computed(() => filteredSchedules.value.slice(0, 5));
const recentRunsScoped = computed(() => filteredRuns.value.slice(0, 10));

const headers = [
  { title: 'Clinic', key: 'clinic_id', sortable: false },
  { title: 'Type', key: 'run_type', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Target Date', key: 'target_date', sortable: false },
  { title: 'Rows', key: 'inserted_rows_count', align: 'end' as const },
  { title: 'Started', key: 'started_at', sortable: false },
];

const eventHeaders = [
  { title: 'Clinic', key: 'clinic_id', sortable: false },
  { title: 'Severity', key: 'severity', sortable: false },
  { title: 'Event', key: 'event_type', sortable: false },
  { title: 'Message', key: 'message', sortable: false },
  { title: 'At', key: 'created_at', sortable: false },
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
  const clinicScope = selectedClientId.value
    ? (selectedClientClinicIds.value.length > 0 ? selectedClientClinicIds.value : ['__no-clinics__'])
    : [];

  await Promise.all([
    fetchRuns({ page: 1, per_page: 20, clinic_ids: clinicScope }),
    fetchSchedules(selectedClientId.value || undefined),
    fetchHealth(),
    fetchEvents(undefined, selectedClientId.value ? 100 : 10),
    fetchWorkstations(),
  ]);
}

function eventColor(severity: string): string {
  if (severity === 'ERROR') return 'error';
  if (severity === 'WARNING') return 'warning';
  return 'info';
}

function weekdayTitle(day: number): string {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day] || `Day ${day}`;
}

function workingDaysText(days: number[]): string {
  if (!days.length) return 'No weekdays configured';
  return days.map(weekdayTitle).join(', ');
}

function slackTargetText(webhook?: string | null): string {
  if (!webhook) return 'No Slack target configured';
  try {
    const url = new URL(webhook);
    const parts = url.pathname.split('/').filter(Boolean);
    return `${url.host} · …/${parts.slice(-2).join('/')}`;
  } catch {
    return webhook.length > 36 ? `${webhook.slice(0, 36)}…` : webhook;
  }
}

function slackMentionsText(mentions?: string[]): string {
  if (!mentions?.length) return 'No mentions configured';
  return mentions.join(', ');
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return String(err || fallback);
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
  } catch (err: unknown) {
    snackbarText.value = getErrorMessage(err, 'Failed to trigger extraction.');
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

async function onClientChange() {
  if (triggerForm.value.clinic_id && !selectedClientClinicIds.value.includes(triggerForm.value.clinic_id)) {
    triggerForm.value.clinic_id = '';
  }
  await refreshDashboard();
}
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

        <v-row class="mb-1">
          <v-col cols="12" md="4" lg="3">
            <v-select
              v-model="selectedClientId"
              :items="clientItems"
              item-title="title"
              item-value="value"
              label="Client"
              variant="outlined"
              color="primary"
              hide-details="auto"
              @update:model-value="onClientChange"
            />
          </v-col>
        </v-row>

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
            <UiParentCard title="Healthy Clinics">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightwarning mr-3" rounded>
                  <SettingsIcon size="22" class="text-warning" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold text-warning">{{ healthSummary.healthy }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Clinics currently healthy</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>

          <v-col cols="12" sm="6" lg="3">
            <UiParentCard title="Notification Backlog">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightinfo mr-3" rounded>
                  <CalendarStatsIcon size="22" class="text-info" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold">{{ healthSummary.notification_backlog }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Pending + failed notifications</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <UiParentCard title="Degraded Clinics">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightwarning mr-3" rounded>
                  <AlertTriangleIcon size="22" class="text-warning" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold text-warning">{{ healthSummary.degraded }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Need operator attention</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
          <v-col cols="12" md="6">
            <UiParentCard title="Down Clinics">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lighterror mr-3" rounded>
                  <AlertCircleIcon size="22" class="text-error" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold text-error">{{ healthSummary.down }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Rollout blockers</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
          <v-col cols="12" md="6">
            <UiParentCard title="Robot Health">
              <div class="d-flex align-center justify-space-between ga-3">
                <div class="d-flex align-center">
                  <v-avatar size="44" class="bg-lightprimary mr-3" rounded>
                    <ActivityIcon size="22" class="text-primary" stroke-width="1.5" />
                  </v-avatar>
                  <div>
                    <h3 class="text-h5 font-weight-bold">
                      {{ robotHealthyCount }}/{{ robotTotalCount }} online
                    </h3>
                    <span class="text-body-2 text-medium-emphasis">
                      {{ robotStaleCount }} stale workstations
                    </span>
                  </div>
                </div>
                <v-btn color="primary" variant="tonal" to="/main/extraction/robots">
                  View robots
                </v-btn>
              </div>
            </UiParentCard>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <UiParentCard title="Slack Coverage">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightsuccess mr-3" rounded>
                  <SettingsIcon size="22" class="text-success" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold text-success">{{ slackConfiguredCount }}/{{ filteredSchedules.length }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Clinics with clinic-level Slack target override visible</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
          <v-col cols="12" md="6">
            <UiParentCard title="Weekday Policies">
              <div class="d-flex align-center">
                <v-avatar size="44" class="bg-lightinfo mr-3" rounded>
                  <CalendarStatsIcon size="22" class="text-info" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <h3 class="text-h5 font-weight-bold">{{ explicitWeekdayCount }}</h3>
                  <span class="text-body-2 text-medium-emphasis">Schedules exposing explicit working-day lists</span>
                </div>
              </div>
            </UiParentCard>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <UiParentCard title="Policy Snapshot">
              <div class="d-flex flex-column ga-3">
                <v-card v-for="schedule in policySnapshot" :key="schedule.id" variant="outlined">
                  <v-card-text class="py-3">
                    <div class="font-weight-medium mb-1">{{ clinicName(schedule.clinic_id) }}</div>
                    <div class="text-body-2 mb-1">Slack target: {{ slackTargetText(schedule.effective_policy?.slack_webhook ?? schedule.slack_webhook) }}</div>
                    <div class="text-body-2 mb-1">Mentions: {{ slackMentionsText(schedule.effective_policy?.slack_mentions ?? schedule.slack_mentions) }}</div>
                    <div class="text-body-2">Working days: {{ workingDaysText(schedule.effective_policy?.working_days ?? schedule.working_days ?? []) }}</div>
                  </v-card-text>
                </v-card>
                <div v-if="!policySnapshot.length" class="text-medium-emphasis">No schedule policies loaded yet.</div>
              </div>
            </UiParentCard>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <UiParentCard title="Recent Runs">
              <v-alert
                v-if="!loading && !recentRunsScoped.length"
                type="info"
                variant="tonal"
                closable
                class="mb-4"
              >
                No extraction runs found. Trigger a run to populate this table.
              </v-alert>

              <v-data-table
                :headers="headers"
                :items="recentRunsScoped"
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

        <v-row>
          <v-col cols="12">
            <UiParentCard title="Recent Ops Events">
              <v-data-table
                :headers="eventHeaders"
                :items="filteredEvents"
                :loading="loading"
                item-value="id"
                density="comfortable"
              >
                <template #item.clinic_id="{ item }">
                  <span class="font-weight-medium">{{ clinicName(item.clinic_id) }}</span>
                </template>
                <template #item.severity="{ item }">
                  <v-chip :color="eventColor(item.severity)" size="small" variant="tonal">
                    {{ item.severity }}
                  </v-chip>
                </template>
                <template #item.created_at="{ item }">
                  {{ formatDate(item.created_at) }}
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
