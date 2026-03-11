<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useClinicStore } from '@/stores/clinics';
import {
  PlusIcon,
  DeviceFloppyIcon as SaveIcon,
  EditIcon,
  ToggleLeftIcon,
} from 'vue-tabler-icons';

const props = defineProps<{ clinicId: string; clientId?: string }>();
const clinicStore = useClinicStore();

const STEP_TYPES = [
  'plan_matching', 'validate_prior_verification', 'update_ins_plan',
  'update_benefits_category', 'update_benefits_code', 'update_benefits_code_diff',
  'force_zero', 'update_deductibles', 'update_annual_max', 'update_ortho_max',
  'insert_exclusions', 'update_frequencies', 'update_age_limits', 'update_history',
  'update_fee_schedule', 'change_apt_color', 'update_appointment_tags',
  'update_provider', 'update_verification_dates', 'render_note',
  'subscriber_note', 'create_commlog', 'upload_document',
  'drop_plan', 'create_ins_adjustment',
];

const FAILURE_OPTIONS = ['HALT', 'SKIP', 'CONTINUE', 'RETRY_3'];

interface StepRow {
  id?: string;
  step_type: string;
  step_order: number;
  on_failure: string;
  is_enabled: boolean;
  step_config: Record<string, any>;
}

interface ProfileItem {
  id: string;
  profile_name: string;
  is_default: boolean;
}

const profiles = ref<ProfileItem[]>([]);
const selectedProfileId = ref<string>('');
const steps = ref<StepRow[]>([]);
const loadingProfiles = ref(true);
const loadingSteps = ref(false);
const saving = ref(false);
const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');

// JSON config dialog
const configDialog = ref(false);
const editingStepIdx = ref<number | null>(null);
const configJson = ref('');
const configError = ref('');

// New profile dialog
const newProfileDialog = ref(false);
const newProfileName = ref('');
const creatingProfile = ref(false);

async function loadProfiles() {
  if (!props.clientId) return;
  loadingProfiles.value = true;
  try {
    const data = await clinicStore.fetchProfiles(props.clientId);
    profiles.value = Array.isArray(data) ? data : [];
    if (profiles.value.length > 0) {
      const defaultProfile = profiles.value.find(p => p.is_default);
      selectedProfileId.value = defaultProfile?.id || profiles.value[0].id;
    }
  } catch {
    profiles.value = [];
  } finally {
    loadingProfiles.value = false;
  }
}

async function loadSteps() {
  if (!selectedProfileId.value) return;
  loadingSteps.value = true;
  try {
    const data = await clinicStore.fetchProfileSteps(selectedProfileId.value);
    steps.value = Array.isArray(data) ? data.map((s: any, idx: number) => ({
      id: s.id,
      step_type: s.step_type || '',
      step_order: s.step_order ?? idx + 1,
      on_failure: s.on_failure || 'HALT',
      is_enabled: s.is_enabled !== false,
      step_config: s.step_config || {},
    })) : [];
  } catch {
    steps.value = [];
  } finally {
    loadingSteps.value = false;
  }
}

watch(selectedProfileId, () => {
  if (selectedProfileId.value) loadSteps();
});

function addStep() {
  steps.value.push({
    step_type: 'plan_matching',
    step_order: steps.value.length + 1,
    on_failure: 'HALT',
    is_enabled: true,
    step_config: {},
  });
}

function openConfigDialog(idx: number) {
  editingStepIdx.value = idx;
  configJson.value = JSON.stringify(steps.value[idx].step_config, null, 2);
  configError.value = '';
  configDialog.value = true;
}

function saveConfig() {
  try {
    const parsed = JSON.parse(configJson.value);
    if (editingStepIdx.value !== null) {
      steps.value[editingStepIdx.value].step_config = parsed;
    }
    configError.value = '';
    configDialog.value = false;
  } catch (e: any) {
    configError.value = `Invalid JSON: ${e.message}`;
  }
}

async function saveSteps() {
  if (!selectedProfileId.value) return;
  saving.value = true;
  try {
    // Re-number step_order before saving
    const ordered = steps.value.map((s, idx) => ({ ...s, step_order: idx + 1 }));
    await clinicStore.saveProfileSteps(selectedProfileId.value, ordered);
    steps.value = ordered;
    snackbarMsg.value = 'Pipeline steps saved';
    snackbarColor.value = 'success';
  } catch (e: any) {
    snackbarMsg.value = e.message || 'Failed to save steps';
    snackbarColor.value = 'error';
  } finally {
    saving.value = false;
    snackbar.value = true;
  }
}

async function createNewProfile() {
  if (!props.clientId || !newProfileName.value.trim()) return;
  creatingProfile.value = true;
  try {
    const created = await clinicStore.createProfile(props.clientId, {
      profile_name: newProfileName.value.trim(),
    });
    profiles.value.push(created);
    selectedProfileId.value = created.id;
    newProfileName.value = '';
    newProfileDialog.value = false;
    snackbarMsg.value = 'Profile created';
    snackbarColor.value = 'success';
    snackbar.value = true;
  } catch (e: any) {
    snackbarMsg.value = e.message || 'Failed to create profile';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    creatingProfile.value = false;
  }
}

onMounted(loadProfiles);
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <h6 class="text-h6 font-weight-bold">Pipeline Configuration</h6>
      <div class="d-flex ga-2">
        <v-btn color="secondary" variant="tonal" size="small" @click="newProfileDialog = true">
          <PlusIcon size="16" stroke-width="1.5" class="mr-1" />
          New Profile
        </v-btn>
      </div>
    </div>

    <v-progress-circular v-if="loadingProfiles" indeterminate color="primary" class="d-block mx-auto my-6" />

    <template v-else>
      <v-alert v-if="profiles.length === 0" type="info" variant="tonal" class="mb-4">
        No pipeline profiles found. Create one to configure steps.
      </v-alert>

      <template v-else>
        <v-select
          v-model="selectedProfileId"
          :items="profiles"
          item-title="profile_name"
          item-value="id"
          label="Profile"
          variant="outlined"
          color="primary"
          density="compact"
          hide-details
          class="mb-4"
          style="max-width: 320px"
        />

        <v-progress-circular v-if="loadingSteps" indeterminate color="primary" class="d-block mx-auto my-4" />

        <template v-else>
          <v-alert v-if="steps.length === 0" type="info" variant="tonal" class="mb-4">
            No steps configured for this profile. Click "+ Add Step" to begin.
          </v-alert>

          <v-table v-else density="comfortable" class="rounded-lg border mb-4">
            <thead>
              <tr>
                <th style="width: 50px">#</th>
                <th>Step Type</th>
                <th style="width: 140px">On Failure</th>
                <th style="width: 100px" class="text-center">Enabled</th>
                <th style="width: 80px" class="text-center">Config</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(step, idx) in steps" :key="idx">
                <td class="text-body-2 text-medium-emphasis">{{ idx + 1 }}</td>
                <td>
                  <v-select
                    v-model="step.step_type"
                    :items="STEP_TYPES"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </td>
                <td>
                  <v-select
                    v-model="step.on_failure"
                    :items="FAILURE_OPTIONS"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </td>
                <td class="text-center">
                  <v-switch
                    v-model="step.is_enabled"
                    color="primary"
                    hide-details
                    density="compact"
                    class="d-inline-flex"
                  />
                </td>
                <td class="text-center">
                  <v-btn icon variant="text" color="primary" size="small" @click="openConfigDialog(idx)">
                    <EditIcon size="16" stroke-width="1.5" />
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>

          <div class="d-flex ga-2">
            <v-btn color="primary" variant="tonal" size="small" @click="addStep">
              <PlusIcon size="16" stroke-width="1.5" class="mr-1" />
              Add Step
            </v-btn>
            <v-btn color="primary" variant="flat" size="small" :loading="saving" @click="saveSteps">
              <SaveIcon size="16" stroke-width="1.5" class="mr-1" />
              Save Steps
            </v-btn>
          </div>
        </template>
      </template>
    </template>

    <!-- JSON Config Dialog -->
    <v-dialog v-model="configDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h6">Edit Step Config</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="configJson"
            label="Step Config (JSON)"
            variant="outlined"
            rows="12"
            auto-grow
            monospace
            style="font-family: 'Courier New', monospace"
          />
          <v-alert v-if="configError" type="error" variant="tonal" density="compact" class="mt-2">
            {{ configError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="configDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveConfig">Apply</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- New Profile Dialog -->
    <v-dialog v-model="newProfileDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Create Pipeline Profile</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newProfileName"
            label="Profile Name"
            variant="outlined"
            color="primary"
            placeholder="e.g., Default Pipeline"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="newProfileDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="creatingProfile"
            :disabled="!newProfileName.trim()"
            @click="createNewProfile"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000" location="bottom right">
      {{ snackbarMsg }}
    </v-snackbar>
  </div>
</template>
