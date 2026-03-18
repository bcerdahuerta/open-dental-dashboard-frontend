<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useClinicStore } from '@/stores/clinics';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import {
  PlusIcon,
  DeviceFloppyIcon as SaveIcon,
  EditIcon,
  ToggleLeftIcon,
  InfoCircleIcon,
  SettingsIcon,
  TrashIcon,
} from 'vue-tabler-icons';

const props = defineProps<{ clinicId: string; clientId?: string }>();
const clinicStore = useClinicStore();

const STEP_TYPES = [
  'plan_matching', 'validate_prior_verification', 'update_ins_plan',
  'update_benefits_category', 'update_benefits_code', 'update_benefits_code_diff',
  'force_zero', 'update_deductibles', 'update_annual_max', 'update_ortho_max',
  'insert_exclusions', 'update_frequencies', 'update_age_limits', 'update_history',
  'update_fee_schedule', 'change_apt_color', 'update_appointment_tags',
  'update_provider', 'update_verification_dates', 'update_effective_date',
  'render_note', 'subscriber_note', 'create_commlog', 'upload_document',
  'drop_plan', 'create_ins_adjustment', 'update_insverify', 'update_spreadsheet_column',
  'plan_matching_note',
];

const FAILURE_OPTIONS = ['HALT', 'SKIP', 'CONTINUE', 'RETRY_3'];

interface StepRow {
  id?: string;
  step_type: string;
  step_order: number;
  on_failure: string;
  is_enabled: boolean;
  step_config: Record<string, any>;
  run_condition: Record<string, any> | null;
}

interface ProfileItem {
  id: string;
  profile_name: string;
  is_default: boolean;
  verification_type?: string;
  target_status?: string;
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
const newProfileVerificationType = ref('ELG');
const newProfileTargetStatus = ref('');
const creatingProfile = ref(false);

// Deactivate profile
const deactivateDialog = ref(false);
const deactivateProfileId = ref<string>('');
const deactivateProfileName = ref<string>('');

// Condition dialog
const conditionDialog = ref(false);
const editingConditionIdx = ref<number | null>(null);
const conditionField = ref('');
const conditionOp = ref('exists');
const conditionValue = ref('');
const conditionValues = ref('');

// Step Guide dialog
const guideDialog = ref(false);
const guideLoading = ref(false);
const guideData = ref<Record<string, any> | null>(null);

// Seed defaults
const seeding = ref(false);

const apiUrl = import.meta.env.VITE_API_URL;

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
      run_condition: s.run_condition || null,
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
    run_condition: null,
  });
}

async function removeStep(idx: number) {
  steps.value.splice(idx, 1);
  // Re-number and auto-save
  steps.value.forEach((s, i) => { s.step_order = i + 1; });
  if (selectedProfileId.value && steps.value.length >= 0) {
    await saveSteps();
  }
}

function promptDeactivateProfile() {
  const prof = profiles.value.find(p => p.id === selectedProfileId.value);
  if (!prof) return;
  deactivateProfileId.value = prof.id;
  deactivateProfileName.value = prof.profile_name;
  deactivateDialog.value = true;
}

async function confirmDeactivateProfile() {
  try {
    await fetchWrapper.delete(`${apiUrl}/profiles/${deactivateProfileId.value}`);
    profiles.value = profiles.value.filter(p => p.id !== deactivateProfileId.value);
    if (profiles.value.length > 0) {
      selectedProfileId.value = profiles.value[0].id;
    } else {
      selectedProfileId.value = '';
      steps.value = [];
    }
    snackbarMsg.value = 'Profile deactivated';
    snackbarColor.value = 'success';
    snackbar.value = true;
  } catch (e: any) {
    snackbarMsg.value = e.message || 'Failed to deactivate';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    deactivateDialog.value = false;
  }
}

function openConditionDialog(idx: number) {
  editingConditionIdx.value = idx;
  const cond = steps.value[idx].run_condition;
  if (cond) {
    conditionField.value = cond.field || '';
    conditionOp.value = cond.op || 'exists';
    conditionValue.value = cond.value || '';
    conditionValues.value = Array.isArray(cond.values) ? cond.values.join(',') : '';
  } else {
    conditionField.value = '';
    conditionOp.value = 'exists';
    conditionValue.value = '';
    conditionValues.value = '';
  }
  conditionDialog.value = true;
}

function clearCondition() {
  if (editingConditionIdx.value !== null) {
    steps.value[editingConditionIdx.value].run_condition = null;
  }
  conditionDialog.value = false;
}

function applyCondition() {
  if (editingConditionIdx.value !== null) {
    const cond: Record<string, any> = { field: conditionField.value.trim(), op: conditionOp.value };
    if (conditionOp.value === 'equals' || conditionOp.value === 'contains') {
      cond.value = conditionValue.value;
    } else if (conditionOp.value === 'in') {
      cond.values = conditionValues.value.split(',').map(s => s.trim()).filter(s => s);
    }
    steps.value[editingConditionIdx.value].run_condition = cond;
  }
  conditionDialog.value = false;
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
  if (!props.clientId || !newProfileName.value.trim() || !newProfileVerificationType.value || !newProfileTargetStatus.value.trim()) return;
  creatingProfile.value = true;
  try {
    const created = await clinicStore.createProfile(props.clientId, {
      profile_name: newProfileName.value.trim(),
      verification_type: newProfileVerificationType.value,
      target_status: newProfileTargetStatus.value.trim(),
    });
    profiles.value.push(created);
    selectedProfileId.value = created.id;
    newProfileName.value = '';
    newProfileVerificationType.value = 'ELG';
    newProfileTargetStatus.value = '';
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

async function seedDefaults() {
  if (!props.clientId) return;
  seeding.value = true;
  try {
    const result = await fetchWrapper.post(`${apiUrl}/pipeline/${props.clientId}/seed-defaults`, {});
    const data = result.data || result;
    snackbarMsg.value = `${data.created_count} profiles created, ${data.skipped_count} skipped`;
    snackbarColor.value = 'success';
    snackbar.value = true;
    await loadProfiles();
  } catch (e: any) {
    snackbarMsg.value = e.message || 'Failed to seed profiles';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    seeding.value = false;
  }
}

async function openGuideDialog(stepType: string) {
  guideLoading.value = true;
  guideDialog.value = true;
  guideData.value = null;
  try {
    const result = await fetchWrapper.get(`${apiUrl}/pipeline/step-guide/${stepType}`);
    guideData.value = result.data || result;
  } catch (e: any) {
    guideData.value = { title: stepType, description: 'Failed to load guide.' };
  } finally {
    guideLoading.value = false;
  }
}
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <h6 class="text-h6 font-weight-bold">Pipeline Configuration</h6>
      <div class="d-flex ga-2">
        <v-btn color="warning" variant="tonal" size="small" :loading="seeding" @click="seedDefaults">
          <SettingsIcon size="16" stroke-width="1.5" class="mr-1" />
          Load Default Profiles
        </v-btn>
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
          :item-title="(p) => p.verification_type ? `${p.verification_type} — ${p.target_status} (${p.profile_name})` : p.profile_name"
          item-value="id"
          label="Profile"
          variant="outlined"
          color="primary"
          density="compact"
          hide-details
          class="mb-4"
          style="max-width: 320px"
        />
        <v-btn
          v-if="selectedProfileId"
          icon
          variant="text"
          color="error"
          size="small"
          class="ml-2"
          @click="promptDeactivateProfile"
        >
          <TrashIcon size="18" stroke-width="1.5" />
          <v-tooltip activator="parent" location="top">Deactivate Profile</v-tooltip>
        </v-btn>

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
                <th style="width: 40px" class="text-center">ℹ️</th>
                <th style="width: 140px">On Failure</th>
                <th style="width: 110px" class="text-center">Condition</th>
                <th style="width: 100px" class="text-center">Enabled</th>
                <th style="width: 80px" class="text-center">Config</th>
                <th style="width: 50px" class="text-center"></th>
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
                <td class="text-center">
                  <v-btn icon variant="text" color="info" size="x-small" @click="openGuideDialog(step.step_type)">
                    <InfoCircleIcon size="16" stroke-width="1.5" />
                  </v-btn>
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
                  <v-chip v-if="step.run_condition" size="small" color="primary" variant="tonal" @click="openConditionDialog(idx)">
                    {{ step.run_condition.field }}
                    <EditIcon size="12" class="ml-1" />
                  </v-chip>
                  <v-btn v-else icon variant="text" size="small" color="grey" @click="openConditionDialog(idx)">
                    <PlusIcon size="16" />
                  </v-btn>
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
                <td class="text-center">
                  <v-btn icon variant="text" color="error" size="x-small" @click="removeStep(idx)">
                    <TrashIcon size="16" stroke-width="1.5" />
                    <v-tooltip activator="parent" location="top">Delete Step</v-tooltip>
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

    <!-- Condition Editor Dialog -->
    <v-dialog v-model="conditionDialog" max-width="500">
      <v-card>
        <v-card-title>Edit Run Condition</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="conditionField"
            label="Field"
            placeholder="e.g., has_form, pdf_files"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-select
            v-model="conditionOp"
            :items="['exists', 'not_exists', 'equals', 'in', 'contains']"
            label="Operator"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-if="conditionOp === 'equals' || conditionOp === 'contains'"
            v-model="conditionValue"
            label="Value"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-if="conditionOp === 'in'"
            v-model="conditionValues"
            label="Values (comma-separated)"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" color="error" @click="clearCondition">Remove Condition</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="conditionDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="applyCondition">Apply</v-btn>
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
            density="compact"
            color="primary"
            placeholder="e.g., Default Pipeline"
            class="mb-3"
          />
          <v-select
            v-model="newProfileVerificationType"
            :items="['FBD', 'ELG', 'SHORT_FORM']"
            label="Verification Type"
            variant="outlined"
            density="compact"
            color="primary"
            class="mb-3"
          />
          <v-text-field
            v-model="newProfileTargetStatus"
            label="Target Status"
            variant="outlined"
            density="compact"
            color="primary"
            placeholder="e.g., Active,Max Out"
            hint="Comma-separated for multiple statuses"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="newProfileDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="creatingProfile"
            :disabled="!newProfileName.trim() || !newProfileVerificationType || !newProfileTargetStatus.trim()"
            @click="createNewProfile"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Step Guide Dialog -->
    <v-dialog v-model="guideDialog" max-width="600">
      <v-card>
        <v-card-title class="text-h6">
          <InfoCircleIcon size="20" class="mr-2" />
          {{ guideData?.title || 'Loading...' }}
        </v-card-title>
        <v-card-text>
          <v-progress-circular v-if="guideLoading" indeterminate color="primary" class="d-block mx-auto my-4" />
          <template v-else-if="guideData">
            <div class="text-body-1 mb-4">{{ guideData.description }}</div>

            <div v-if="guideData.when_to_use" class="mb-3">
              <div class="text-subtitle-2 font-weight-bold text-primary mb-1">When to Use</div>
              <div class="text-body-2">{{ guideData.when_to_use }}</div>
            </div>

            <div v-if="guideData.config_fields && Object.keys(guideData.config_fields).length > 0" class="mb-3">
              <div class="text-subtitle-2 font-weight-bold text-primary mb-1">Config Fields</div>
              <v-table density="compact" class="rounded border">
                <tbody>
                  <tr v-for="(desc, key) in guideData.config_fields" :key="key">
                    <td class="font-weight-medium" style="font-family: monospace">{{ key }}</td>
                    <td class="text-body-2">{{ desc }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <div v-if="guideData.condition_example" class="mb-3">
              <div class="text-subtitle-2 font-weight-bold text-primary mb-1">Example Condition</div>
              <v-code class="text-body-2 pa-2 rounded">{{ JSON.stringify(guideData.condition_example, null, 2) }}</v-code>
            </div>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="guideDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Deactivate Profile Confirm Dialog -->
    <v-dialog v-model="deactivateDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Deactivate Profile</v-card-title>
        <v-card-text>
          Deactivate profile <strong>"{{ deactivateProfileName }}"</strong>?
          It will be hidden but can be restored.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deactivateDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDeactivateProfile">
            Deactivate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000" location="bottom right">
      {{ snackbarMsg }}
    </v-snackbar>
  </div>
</template>
