<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useExtractionStore } from '@/stores/extraction';
import { RefreshIcon, PencilIcon } from 'vue-tabler-icons';
import type { ExtractionSchedule } from '@/types/extraction';

const extractionStore = useExtractionStore();
const { schedules, clinicNameMap, loading, error } = storeToRefs(extractionStore);
const { hydrateLookups, fetchSchedules, updateSchedule } = extractionStore;

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
});

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
  { title: 'Auto Extract', key: 'auto_extract_enabled', sortable: false },
  { title: 'Extraction Time', key: 'extraction_time', sortable: false },
  { title: 'Review Times', key: 'review_times', sortable: false },
  { title: 'Days in Advance', key: 'days_in_advance', align: 'end' as const },
  { title: 'Business Days Config', key: 'business_days_config', sortable: false },
  { title: 'Timezone', key: 'timezone', sortable: false },
  { title: 'Edit', key: 'actions', sortable: false, align: 'center' as const },
];

function clinicName(clinicId: string): string {
  return clinicNameMap.value[clinicId] || `${clinicId.slice(0, 8)}…`;
}

function businessDaysText(item: ExtractionSchedule): string {
  if (!item.business_days_only) return 'All Days';
  const extras: string[] = [];
  if (item.include_saturday) extras.push('+Sat');
  if (item.include_sunday) extras.push('+Sun');
  return extras.length ? `Mon-Fri ${extras.join(' ')}` : 'Mon-Fri';
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
  };
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
  try {
    await fetchSchedules();
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
    });

    showSnack('Schedule updated successfully.', 'success');
    closeEditDialog();
  } catch (err: any) {
    showSnack(err?.message || 'Failed to update schedule', 'error');
  } finally {
    editLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await hydrateLookups();
    await refreshSchedules();
  } catch (err: any) {
    showSnack(err?.message || String(err), 'error');
  }
});
</script>

<template>
  <BaseBreadcrumb :title="pageMeta.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Extraction Schedules">
        <div class="d-flex align-center mb-4">
          <v-btn color="secondary" variant="tonal" size="small" @click="refreshSchedules">
            <RefreshIcon size="18" class="mr-1" stroke-width="1.5" />
            Refresh
          </v-btn>
          <v-spacer />
        </div>

        <v-data-table
          :headers="headers"
          :items="schedules"
          :loading="loading"
          item-value="id"
          hover
        >
          <template #item.clinic_id="{ item }">
            <span class="font-weight-medium">{{ clinicName(item.clinic_id) }}</span>
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

          <template #item.review_times="{ item }">
            <div class="d-flex ga-1 flex-wrap">
              <v-chip v-for="t in item.review_times" :key="t" size="x-small" variant="tonal" color="primary">
                {{ t }}
              </v-chip>
            </div>
          </template>

          <template #item.business_days_config="{ item }">
            <v-chip size="small" :color="item.business_days_only ? 'success' : 'grey'" variant="tonal">
              {{ businessDaysText(item) }}
            </v-chip>
          </template>

          <template #item.actions="{ item }">
            <v-btn icon variant="text" size="small" @click="openEditDialog(item)">
              <PencilIcon size="16" stroke-width="1.5" />
            </v-btn>
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
              <v-select
                v-model="editForm.timezone"
                :items="timezoneOptions"
                label="Timezone"
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
              />
            </v-col>

            <v-col v-if="editForm.business_days_only" cols="6">
              <v-switch
                v-model="editForm.include_saturday"
                label="Include Saturday"
                color="info"
                hide-details
              />
            </v-col>

            <v-col v-if="editForm.business_days_only" cols="6">
              <v-switch
                v-model="editForm.include_sunday"
                label="Include Sunday"
                color="info"
                hide-details
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
