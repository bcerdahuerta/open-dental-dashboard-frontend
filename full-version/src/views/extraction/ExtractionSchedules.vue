<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useExtractionStore } from '@/stores/extraction';
import { useClientStore } from '@/stores/clients';
import { RefreshIcon, PencilIcon, ActivityIcon } from 'vue-tabler-icons';
import type { ExtractionRolloutCheck, ExtractionSchedule } from '@/types/extraction';

const extractionStore = useExtractionStore();
const clientStore = useClientStore();

const { schedules, clinicNameMap, loading, error } = storeToRefs(extractionStore);
const { clients } = storeToRefs(clientStore);
const { hydrateLookups, fetchSchedules, updateSchedule, fetchRolloutCheck } = extractionStore;

const pageMeta = ref({ title: 'Extraction Schedules' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Extraction', disabled: false, href: '/main/extraction' },
  { title: 'Schedules', disabled: true, href: '#' },
]);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

const showEditDialog = ref(false);
const editLoading = ref(false);
const selectedSchedule = ref<ExtractionSchedule | null>(null);
const newReviewTime = ref('');
const rolloutDialog = ref(false);
const rolloutCheck = ref<ExtractionRolloutCheck | null>(null);
const selectedClientId = ref('');

const clientItems = computed(() => clients.value.map((client) => ({
  title: client.client_name,
  value: client.id,
})));

const visibleSchedules = computed(() => selectedClientId.value ? schedules.value : []);

const editForm = ref({
  auto_extract_enabled: false,
  extraction_time: '06:00',
  review_times: [] as string[],
  days_in_advance: 1,
  review_days_in_advance: 0,
  business_days_only: true,
  include_saturday: false,
  include_sunday: false,
  timezone: 'America/New_York',
  working_days: [0, 1, 2, 3, 4] as number[],
  review_day_offsets_text: '0',
  slack_webhook: '',
  slack_mentions_text: '',
  max_parallel_runs_per_clinic: 2,
});

const weekdayOptions = [
  { title: 'Monday', value: 0 },
  { title: 'Tuesday', value: 1 },
  { title: 'Wednesday', value: 2 },
  { title: 'Thursday', value: 3 },
  { title: 'Friday', value: 4 },
  { title: 'Saturday', value: 5 },
  { title: 'Sunday', value: 6 },
];

const timezoneOptions = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
];

const headers = [
  { title: 'Clinic', key: 'clinic_id', sortable: false },
  { title: 'Owner', key: 'resolved_encargado_name', sortable: false },
  { title: 'Auto Extract', key: 'auto_extract_enabled', sortable: false },
  { title: 'Health', key: 'health', sortable: false },
  { title: 'Effective Policy', key: 'effective_policy', sortable: false },
  { title: 'Notifications', key: 'notification_status', sortable: false },
  { title: 'Edit', key: 'actions', sortable: false, align: 'center' as const },
];

function clinicName(clinicId: string): string {
  return clinicNameMap.value[clinicId] || `${clinicId.slice(0, 8)}…`;
}

function scheduleByClinicId(clinicId: string): ExtractionSchedule | null {
  return schedules.value.find((item) => item.clinic_id === clinicId) || null;
}

function businessDaysText(item: ExtractionSchedule): string {
  if (!item.business_days_only) return 'All Days';
  const extras: string[] = [];
  if (item.include_saturday) extras.push('+Sat');
  if (item.include_sunday) extras.push('+Sun');
  return extras.length ? `Mon-Fri ${extras.join(' ')}` : 'Mon-Fri';
}

function weekdayTitle(day: number): string {
  return weekdayOptions.find((option) => option.value === day)?.title ?? `Day ${day}`;
}

function workingDaysText(item: ExtractionSchedule): string {
  const workingDays = item.effective_policy?.working_days ?? item.working_days ?? [];
  if (!workingDays.length) return 'No weekdays configured';
  if (workingDays.length === 7) return 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday';
  return workingDays.map(weekdayTitle).join(', ');
}

function resolvedOwnerText(item: ExtractionSchedule): string {
  if (!item.resolved_encargado_name) return '—';
  if (!item.resolved_assignment_scope) return item.resolved_encargado_name;
  return `${item.resolved_encargado_name} (${item.resolved_assignment_scope})`;
}

function healthColor(status?: string | null): string {
  if (status === 'DOWN') return 'error';
  if (status === 'DEGRADED') return 'warning';
  return 'success';
}

function reviewOffsetsText(item: ExtractionSchedule): string {
  const offsets = item.effective_policy?.review_day_offsets ?? item.review_day_offsets ?? [];
  if (!offsets.length) return 'No review offsets';
  return offsets.map((offset) => offset === 0 ? 'D+0 same day' : `D+${offset}`).join(', ');
}

function effectivePolicyText(item: ExtractionSchedule): string {
  const policy = item.effective_policy;
  if (!policy) return '—';
  const horizon = policy.horizon_mode === 'calendar_days' ? 'Calendar days' : 'Business days';
  const reviewTimes = policy.review_times.length ? policy.review_times.join(', ') : 'No review slots';
  return `Extract ${policy.extraction_time} | Review ${reviewTimes} | Horizon ${policy.days_in_advance} days | ${horizon}`;
}

function notificationText(item: ExtractionSchedule): string {
  const status = item.notification_status;
  if (!status) return 'No notification status';
  return `Pending ${status.pending_count} · Failed ${status.failed_count}`;
}

function slackTargetText(item: ExtractionSchedule): string {
  const webhook = item.effective_policy?.slack_webhook ?? item.slack_webhook;
  if (!webhook) return 'No Slack target configured';

  try {
    const url = new URL(webhook);
    const parts = url.pathname.split('/').filter(Boolean);
    return `${url.host} · …/${parts.slice(-2).join('/')}`;
  } catch {
    return webhook.length > 36 ? `${webhook.slice(0, 36)}…` : webhook;
  }
}

function slackMentionsText(item: ExtractionSchedule): string {
  const mentions = item.effective_policy?.slack_mentions ?? item.slack_mentions ?? [];
  if (!mentions.length) return 'No mentions configured';
  return mentions.join(', ');
}

function parseSlackMentions(text: string): string[] {
  return text
    .split(',')
    .map((value) => value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

function syncWeekendFlagsFromWorkingDays() {
  editForm.value.include_saturday = editForm.value.working_days.includes(5);
  editForm.value.include_sunday = editForm.value.working_days.includes(6);
}

function syncWorkingDaysFromLegacyFlags() {
  if (!editForm.value.business_days_only) {
    editForm.value.working_days = [0, 1, 2, 3, 4, 5, 6];
    syncWeekendFlagsFromWorkingDays();
    return;
  }

  const workingDays = [0, 1, 2, 3, 4];
  if (editForm.value.include_saturday) workingDays.push(5);
  if (editForm.value.include_sunday) workingDays.push(6);
  editForm.value.working_days = workingDays;
}

function parseReviewOffsets(text: string): number[] {
  return text
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((a, b) => a - b);
}

function showSnack(message: string, color: string) {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

function openEditDialog(schedule: ExtractionSchedule) {
  selectedSchedule.value = schedule;
  editForm.value = {
    auto_extract_enabled: schedule.auto_extract_enabled,
    extraction_time: schedule.extraction_time,
    review_times: [...(schedule.review_times || [])],
    days_in_advance: schedule.days_in_advance,
    review_days_in_advance: schedule.review_days_in_advance,
    business_days_only: schedule.business_days_only,
    include_saturday: schedule.include_saturday,
    include_sunday: schedule.include_sunday,
    timezone: schedule.timezone,
    working_days: [...(schedule.effective_policy?.working_days ?? schedule.working_days ?? [0, 1, 2, 3, 4])],
    review_day_offsets_text: (schedule.effective_policy?.review_day_offsets ?? schedule.review_day_offsets ?? [0]).join(', '),
    slack_webhook: schedule.slack_webhook || '',
    slack_mentions_text: (schedule.slack_mentions ?? []).join(', '),
    max_parallel_runs_per_clinic: schedule.effective_policy?.max_parallel_runs_per_clinic ?? schedule.max_parallel_runs_per_clinic ?? 2,
  };
  syncWeekendFlagsFromWorkingDays();
  newReviewTime.value = '';
  showEditDialog.value = true;
}

function closeEditDialog() {
  showEditDialog.value = false;
  selectedSchedule.value = null;
  newReviewTime.value = '';
}

function addReviewTime() {
  if (!newReviewTime.value) return;
  if (!editForm.value.review_times.includes(newReviewTime.value)) {
    editForm.value.review_times.push(newReviewTime.value);
  }
  newReviewTime.value = '';
}

function removeReviewTime(index: number) {
  editForm.value.review_times.splice(index, 1);
}

async function refreshSchedules() {
  if (!selectedClientId.value) return;

  try {
    await fetchSchedules(selectedClientId.value);
  } catch (err: any) {
    showSnack(err?.message || 'Failed to refresh schedules', 'error');
  }
}

async function onToggleAuto(schedule: ExtractionSchedule, value: boolean) {
  try {
    await updateSchedule(schedule.id, { auto_extract_enabled: Boolean(value) });
    showSnack(`Auto extraction ${value ? 'enabled' : 'disabled'} for ${clinicName(schedule.clinic_id)}.`, 'success');
  } catch (err: any) {
    showSnack(err?.message || 'Failed to update auto-extract toggle', 'error');
  }
}

async function saveEdit() {
  if (!selectedSchedule.value || editLoading.value) return;

  editLoading.value = true;
  try {
    await updateSchedule(selectedSchedule.value.id, {
      auto_extract_enabled: editForm.value.auto_extract_enabled,
      extraction_time: editForm.value.extraction_time,
      review_times: editForm.value.review_times,
      days_in_advance: Number(editForm.value.days_in_advance),
      review_days_in_advance: Number(editForm.value.review_days_in_advance),
      business_days_only: editForm.value.business_days_only,
      include_saturday: editForm.value.include_saturday,
      include_sunday: editForm.value.include_sunday,
      timezone: editForm.value.timezone,
      working_days: editForm.value.business_days_only ? editForm.value.working_days : [0, 1, 2, 3, 4, 5, 6],
      review_day_offsets: parseReviewOffsets(editForm.value.review_day_offsets_text),
      slack_webhook: editForm.value.slack_webhook || null,
      slack_mentions: parseSlackMentions(editForm.value.slack_mentions_text),
      max_parallel_runs_per_clinic: Number(editForm.value.max_parallel_runs_per_clinic),
    });

    showSnack('Schedule updated successfully.', 'success');
    closeEditDialog();
  } catch (err: any) {
    showSnack(err?.message || 'Failed to update schedule', 'error');
  } finally {
    editLoading.value = false;
  }
}

async function openRolloutDialog(schedule: ExtractionSchedule) {
  rolloutCheck.value = await fetchRolloutCheck(schedule.clinic_id);
  rolloutDialog.value = true;
}

onMounted(async () => {
  try {
    await hydrateLookups();
  } catch (err: any) {
    showSnack(err?.message || String(err), 'error');
  }
});

watch(selectedClientId, async (clientId) => {
  if (!clientId) return;
  await refreshSchedules();
});
</script>

<template>
  <BaseBreadcrumb :title="pageMeta.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Extraction Schedules">
        <v-row class="mb-2 align-center">
          <v-col cols="12" md="4" lg="3">
            <v-select
              v-model="selectedClientId"
              :items="clientItems"
              item-title="title"
              item-value="value"
              label="Client"
              placeholder="Select client"
              variant="outlined"
              color="primary"
              hide-details="auto"
              clearable
            />
          </v-col>
          <v-col cols="12" md="8" lg="9" class="d-flex justify-end">
            <v-btn color="secondary" variant="tonal" size="small" :disabled="!selectedClientId" @click="refreshSchedules">
              <RefreshIcon size="18" class="mr-1" stroke-width="1.5" />
              Refresh
            </v-btn>
          </v-col>
        </v-row>

        <v-alert v-if="!selectedClientId" type="info" variant="tonal" class="mb-4">
          Select client to load schedules. This keeps operators out of mixed-client views.
        </v-alert>

        <v-data-table
          :headers="headers"
          :items="visibleSchedules"
          :loading="loading" :items-per-page="25"
          item-value="id"
          hover
        >
          <template #item.clinic_id="{ item }">
            <span class="font-weight-medium">{{ clinicName(item.clinic_id) }}</span>
          </template>

          <template #item.resolved_encargado_name="{ item }">
            <span class="text-medium-emphasis">{{ resolvedOwnerText(item) }}</span>
          </template>

          <template #item.auto_extract_enabled="{ item }">
              <v-switch
                :model-value="item.auto_extract_enabled"
                color="success"
                hide-details
                density="compact"
                :disabled="loading"
                @update:model-value="(value) => onToggleAuto(item, Boolean(value))"
              />
            </template>

          <template #item.health="{ item }">
            <div class="d-flex flex-column ga-1">
              <v-chip size="small" :color="healthColor(item.health?.status)" variant="flat">
                {{ item.health?.status || 'HEALTHY' }}
              </v-chip>
              <span class="text-caption text-medium-emphasis">{{ item.health?.reason_summary || 'No active degradation signals.' }}</span>
            </div>
          </template>

          <template #item.effective_policy="{ item }">
            <div class="d-flex flex-column ga-1">
              <span class="text-body-2">{{ effectivePolicyText(item) }}</span>
              <span class="text-caption text-medium-emphasis">{{ reviewOffsetsText(item) }}</span>
              <span class="text-caption text-medium-emphasis">{{ workingDaysText(item) }}</span>
              <span class="text-caption text-medium-emphasis">{{ businessDaysText(item) }} · {{ item.effective_policy?.timezone || item.timezone }}</span>
            </div>
          </template>

          <template #item.notification_status="{ item }">
            <div class="d-flex flex-column ga-1">
              <span class="text-body-2">{{ notificationText(item) }}</span>
              <span class="text-caption text-medium-emphasis">{{ slackTargetText(item) }}</span>
              <span class="text-caption text-medium-emphasis">{{ slackMentionsText(item) }}</span>
              <span class="text-caption text-medium-emphasis">Parallel runs {{ item.effective_policy?.max_parallel_runs_per_clinic || item.max_parallel_runs_per_clinic || 1 }}</span>
            </div>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex align-center justify-center ga-1">
              <v-btn icon variant="text" size="small" @click="openEditDialog(item)">
                <PencilIcon size="16" stroke-width="1.5" />
              </v-btn>
              <v-tooltip text="Rollout Check — verify policy, health, and blockers">
                <template #activator="{ props }">
                  <v-btn v-bind="props" variant="text" size="small" color="info" @click="openRolloutDialog(item)">
                    <ActivityIcon size="16" class="mr-1" stroke-width="1.5" />
                    Rollout Check
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </template>

          <template #no-data>
            <div class="text-center pa-8 text-medium-emphasis">
              No schedules found. Schedules are created automatically when clinics are added.
            </div>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Edit Dialog -->
  <v-dialog v-model="showEditDialog" max-width="680">
    <v-card v-if="selectedSchedule">
      <v-card-title class="text-h6">
        Edit Schedule — {{ clinicName(selectedSchedule.clinic_id) }}
      </v-card-title>
      <v-card-text>
        <v-form>
          <v-row>
            <v-col cols="12">
              <v-switch
                v-model="editForm.auto_extract_enabled"
                label="Auto Extraction Enabled"
                color="success"
                hide-details
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="editForm.extraction_time"
                type="time"
                label="Extraction Time"
                variant="outlined"
                hide-details
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="editForm.days_in_advance"
                type="number"
                label="Days in Advance"
                variant="outlined"
                hide-details
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="editForm.review_days_in_advance"
                type="number"
                label="Review Days in Advance"
                variant="outlined"
                hide-details
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="editForm.review_day_offsets_text"
                label="Review Day Offsets"
                hint="Comma-separated. Example: 0, 1, 3, 5"
                persistent-hint
                variant="outlined"
                hide-details="auto"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.timezone"
                :items="timezoneOptions"
                label="Timezone"
                variant="outlined"
                hide-details
              />
            </v-col>

            <v-col cols="12">
              <v-select
                v-model="editForm.working_days"
                :items="weekdayOptions"
                item-title="title"
                item-value="value"
                label="Explicit Working Days"
                variant="outlined"
                multiple
                chips
                :disabled="!editForm.business_days_only"
                hide-details="auto"
                @update:model-value="syncWeekendFlagsFromWorkingDays"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="editForm.slack_webhook"
                label="Slack Target Webhook"
                variant="outlined"
                hide-details="auto"
                hint="Leave blank to inherit client-level target."
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="editForm.slack_mentions_text"
                label="Slack Mentions"
                hint="Comma-separated. Example: <@U123>, <!channel>"
                persistent-hint
                variant="outlined"
                hide-details="auto"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="editForm.max_parallel_runs_per_clinic"
                type="number"
                label="Max Parallel Runs per Clinic"
                variant="outlined"
                hide-details
              />
            </v-col>

            <v-col cols="12">
              <div class="text-caption mb-1">Review Times</div>
              <div class="d-flex align-center ga-2 flex-wrap">
                <v-chip
                  v-for="(t, i) in editForm.review_times"
                  :key="i"
                  closable
                  size="small"
                  variant="tonal"
                  color="primary"
                  @click:close="removeReviewTime(i)"
                >
                  {{ t }}
                </v-chip>
                <v-row class="ma-0" style="width: 220px">
                  <v-col cols="8" class="pa-0 pr-1">
                    <v-text-field
                      v-model="newReviewTime"
                      type="time"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="4" class="pa-0 pl-1 d-flex align-center">
                    <v-btn size="small" color="primary" variant="tonal" block @click="addReviewTime">Add</v-btn>
                  </v-col>
                </v-row>
              </div>
            </v-col>

            <v-col cols="12">
              <v-switch
                v-model="editForm.business_days_only"
                label="Business Days Only (Mon-Fri)"
                color="primary"
                hide-details
                @update:model-value="syncWorkingDaysFromLegacyFlags"
              />
            </v-col>

            <v-col v-if="editForm.business_days_only" cols="6">
              <v-switch
                v-model="editForm.include_saturday"
                label="Include Saturday"
                color="info"
                hide-details
                @update:model-value="syncWorkingDaysFromLegacyFlags"
              />
            </v-col>

            <v-col v-if="editForm.business_days_only" cols="6">
              <v-switch
                v-model="editForm.include_sunday"
                label="Include Sunday"
                color="info"
                hide-details
                @update:model-value="syncWorkingDaysFromLegacyFlags"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeEditDialog">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="editLoading" @click="saveEdit">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="rolloutDialog" max-width="760">
    <v-card v-if="rolloutCheck">
      <v-card-title class="text-h6">Rollout Check — {{ rolloutCheck.clinic_name }}</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-chip :color="rolloutCheck.safe_for_rollout ? 'success' : 'warning'" variant="flat" class="mb-3">
              {{ rolloutCheck.safe_for_rollout ? 'Safe for rollout' : 'Needs action before rollout' }}
            </v-chip>
            <div class="text-caption text-medium-emphasis">Health</div>
            <div class="mb-3">{{ rolloutCheck.health.status }} — {{ rolloutCheck.health.reason_summary }}</div>
            <div class="text-caption text-medium-emphasis">Policy</div>
            <div class="mb-3">{{ effectivePolicyText({ clinic_id: rolloutCheck.clinic_id, effective_policy: rolloutCheck.effective_policy, timezone: rolloutCheck.effective_policy.timezone, business_days_only: rolloutCheck.effective_policy.horizon_mode !== 'calendar_days', include_saturday: rolloutCheck.effective_policy.working_days.includes(5), include_sunday: rolloutCheck.effective_policy.working_days.includes(6) } as ExtractionSchedule) }}</div>
            <div class="text-caption text-medium-emphasis">Working Days</div>
            <div class="mb-3">{{ workingDaysText({ clinic_id: rolloutCheck.clinic_id, effective_policy: rolloutCheck.effective_policy, working_days: rolloutCheck.effective_policy.working_days } as ExtractionSchedule) }}</div>
            <div class="text-caption text-medium-emphasis">Review Offsets</div>
            <div>{{ rolloutCheck.effective_policy.review_day_offsets.map((offset: number) => offset === 0 ? 'D+0 same day' : `D+${offset}`).join(', ') }}</div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="text-caption text-medium-emphasis">Notification Status</div>
            <div class="mb-3">Pending {{ rolloutCheck.notification_status.pending_count }} · Failed {{ rolloutCheck.notification_status.failed_count }}</div>
            <div class="text-caption text-medium-emphasis">Slack Target</div>
            <div class="mb-3">{{ slackTargetText(scheduleByClinicId(rolloutCheck.clinic_id) || {} as ExtractionSchedule) }}</div>
            <div class="text-caption text-medium-emphasis">Slack Mentions</div>
            <div class="mb-3">{{ slackMentionsText(scheduleByClinicId(rolloutCheck.clinic_id) || {} as ExtractionSchedule) }}</div>
            <div class="text-caption text-medium-emphasis">Blockers</div>
            <div class="d-flex ga-1 flex-wrap">
              <v-chip v-for="blocker in rolloutCheck.blockers" :key="blocker" size="small" color="warning" variant="tonal">
                {{ blocker }}
              </v-chip>
              <span v-if="!rolloutCheck.blockers.length" class="text-body-2">No blockers.</span>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="rolloutDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Error -->
  <v-row v-if="error">
    <v-col cols="12">
      <v-alert type="error" variant="tonal" closable>{{ error }}</v-alert>
    </v-col>
  </v-row>

  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarText }}
  </v-snackbar>
</template>
