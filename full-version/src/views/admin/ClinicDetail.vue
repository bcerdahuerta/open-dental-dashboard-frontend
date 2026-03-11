<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useClinicStore } from '@/stores/clinics';
import { useWritebackStore } from '@/stores/writeback';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BenefitMappingsTab from './clinic-config/BenefitMappingsTab.vue';
import FrequencyMappingsTab from './clinic-config/FrequencyMappingsTab.vue';
import AgeLimitMappingsTab from './clinic-config/AgeLimitMappingsTab.vue';
import PipelineStepsTab from './clinic-config/PipelineStepsTab.vue';
import {
  DeviceFloppyIcon as SaveIcon,
  KeyIcon,
  PlugConnectedIcon,
  BuildingIcon,
  CircleCheckIcon,
  CircleXIcon,
  LoaderIcon,
  ClockIcon,
  ToggleLeftIcon
} from 'vue-tabler-icons';

const route = useRoute();
const clinicId = route.params.id as string;
const clinicStore = useClinicStore();
const writebackStore = useWritebackStore();
const { currentClinic, credentials, loading, error } = storeToRefs(clinicStore);

// Tab
const activeTab = ref('overview');

// Writeback config
const writebackForm = ref({
  writeback_mode: 'manual',
  quiet_start: null as string | null,
  quiet_end: null as string | null,
  timezone: 'America/Chicago'
});
const savingWbConfig = ref(false);
const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles'
];

// Clinic info form
const clinicForm = ref({
  clinic_name: '',
  ccc_clinic_id: '',
  clinic_num: null as number | null,
  spreadsheet_id: '',
  folder_id: '',
  images_folder_id: 131,
  is_active: true
});
const clinicFormValid = ref(false);
const savingClinic = ref(false);

// Credential form
const credForm = ref({
  credential_type: 'opendental_api',
  key_name: '',
  value: ''
});
const credTypes = ['opendental_api', 'google', 'ccc', 'docx_converter'];
const savingCred = ref(false);

// Test connection
const testingSheets = ref(false);
const testingOD = ref(false);
const sheetsResult = ref<{ connected: boolean; message: string } | null>(null);
const odResult = ref<{ connected: boolean; message: string } | null>(null);

// Snackbar
const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');

function showSnackbar(msg: string, color: string) {
  snackbarMsg.value = msg;
  snackbarColor.value = color;
  snackbar.value = true;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

async function loadClinic() {
  try {
    const clinic = await clinicStore.fetchClinic(clinicId);
    if (clinic) {
      clinicForm.value = {
        clinic_name: clinic.clinic_name || '',
        ccc_clinic_id: clinic.ccc_clinic_id || '',
        clinic_num: clinic.clinic_num,
        spreadsheet_id: clinic.spreadsheet_id || '',
        folder_id: clinic.folder_id || '',
        images_folder_id: clinic.images_folder_id || 131,
        is_active: clinic.is_active
      };
    }
  } catch (e: any) {
    showSnackbar(e.message || 'Failed to load clinic', 'error');
  }
}

async function saveClinicInfo() {
  if (!clinicFormValid.value) return;
  savingClinic.value = true;
  try {
    const payload: any = { ...clinicForm.value };
    if (!payload.ccc_clinic_id) payload.ccc_clinic_id = null;
    if (!payload.clinic_num) payload.clinic_num = null;
    if (!payload.spreadsheet_id) payload.spreadsheet_id = null;
    if (!payload.folder_id) payload.folder_id = null;

    await clinicStore.updateClinic(clinicId, payload);
    showSnackbar('Clinic updated successfully', 'success');
  } catch (e: any) {
    showSnackbar(e.message || 'Failed to update clinic', 'error');
  } finally {
    savingClinic.value = false;
  }
}

async function saveCredential() {
  if (!credForm.value.key_name || !credForm.value.value) return;
  savingCred.value = true;
  try {
    await clinicStore.upsertCredential(clinicId, credForm.value);
    credForm.value = { credential_type: 'opendental_api', key_name: '', value: '' };
    showSnackbar('Credential saved successfully', 'success');
  } catch (e: any) {
    showSnackbar(e.message || 'Failed to save credential', 'error');
  } finally {
    savingCred.value = false;
  }
}

async function testSheets() {
  testingSheets.value = true;
  sheetsResult.value = null;
  try {
    sheetsResult.value = await clinicStore.testConnection(clinicId, 'sheets');
  } finally {
    testingSheets.value = false;
  }
}

async function testOpenDental() {
  testingOD.value = true;
  odResult.value = null;
  try {
    odResult.value = await clinicStore.testConnection(clinicId, 'opendental');
  } finally {
    testingOD.value = false;
  }
}

async function loadWritebackConfig() {
  try {
    const cfg = await writebackStore.fetchWritebackConfig(clinicId);
    writebackForm.value = {
      writeback_mode: cfg.writeback_mode || 'manual',
      quiet_start: cfg.quiet_start || null,
      quiet_end: cfg.quiet_end || null,
      timezone: cfg.timezone || 'America/Chicago'
    };
  } catch (e: any) {
    // Use defaults
  }
}

async function saveWritebackConfig() {
  savingWbConfig.value = true;
  try {
    const payload: any = { ...writebackForm.value };
    if (payload.writeback_mode === 'manual') {
      payload.quiet_start = null;
      payload.quiet_end = null;
    }
    await writebackStore.saveWritebackConfig(clinicId, payload);
    showSnackbar('Writeback config saved', 'success');
  } catch (e: any) {
    showSnackbar(e.message || 'Failed to save config', 'error');
  } finally {
    savingWbConfig.value = false;
  }
}

onMounted(async () => {
  await loadClinic();
  await clinicStore.fetchCredentials(clinicId);
  await loadWritebackConfig();
});
</script>

<template>
  <v-row v-if="loading" justify="center" class="pa-10">
    <v-progress-circular indeterminate color="primary" />
  </v-row>

  <v-row v-else>
    <v-col cols="12">
      <!-- Clinic Header -->
      <UiParentCard :title="currentClinic?.clinic_name || 'Clinic Details'">
        <template #action>
          <v-chip v-if="currentClinic" :color="currentClinic.is_active ? 'success' : 'error'" size="small">
            {{ currentClinic.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <v-tabs v-model="activeTab" color="primary" align-tabs="start">
          <v-tab value="overview">Overview</v-tab>
          <v-tab value="benefits">Benefits</v-tab>
          <v-tab value="frequencies">Frequencies</v-tab>
          <v-tab value="age-limits">Age Limits</v-tab>
          <v-tab value="pipeline">Pipeline</v-tab>
        </v-tabs>

        <v-divider />

        <v-window v-model="activeTab" class="mt-4">
          <!-- Overview Tab -->
          <v-window-item value="overview">
            <v-row>
              <!-- Clinic Info Form -->
              <v-col cols="12">
                <h6 class="text-subtitle-1 font-weight-bold mb-4">
                  <BuildingIcon size="18" stroke-width="1.5" class="mr-1" />
                  Clinic Information
                </h6>

                <v-form v-model="clinicFormValid">
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="clinicForm.clinic_name"
                        label="Clinic Name"
                        :rules="[(v: string) => !!v || 'Required']"
                        variant="outlined"
                        color="primary"
                        hide-details="auto"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number="clinicForm.clinic_num"
                        label="OD Clinic Num"
                        type="number"
                        variant="outlined"
                        color="primary"
                        hide-details="auto"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="clinicForm.ccc_clinic_id"
                        label="CCC Clinic ID"
                        variant="outlined"
                        color="primary"
                        hide-details="auto"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="clinicForm.spreadsheet_id"
                        label="Spreadsheet ID"
                        variant="outlined"
                        color="primary"
                        hide-details="auto"
                        placeholder="Override (inherits from client)"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="clinicForm.folder_id"
                        label="Folder ID"
                        variant="outlined"
                        color="primary"
                        hide-details="auto"
                        placeholder="Override (inherits from client)"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-text-field
                        v-model.number="clinicForm.images_folder_id"
                        label="Images Folder ID"
                        type="number"
                        variant="outlined"
                        color="primary"
                        hide-details="auto"
                      />
                    </v-col>
                    <v-col cols="12" md="3">
                      <v-switch
                        v-model="clinicForm.is_active"
                        label="Active"
                        color="primary"
                        hide-details
                      />
                    </v-col>
                  </v-row>

                  <div class="mt-4">
                    <v-btn color="primary" variant="flat" :loading="savingClinic" @click="saveClinicInfo">
                      <SaveIcon size="18" stroke-width="1.5" class="mr-1" />
                      Save Changes
                    </v-btn>
                  </div>
                </v-form>
              </v-col>
            </v-row>

            <v-divider class="my-6" />

            <v-row>
              <!-- Credentials -->
              <v-col cols="12" md="6">
                <h6 class="text-subtitle-1 font-weight-bold mb-3">
                  <KeyIcon size="18" stroke-width="1.5" class="mr-1" />
                  Credentials
                  <v-chip color="primary" size="x-small" class="ml-2">{{ credentials.length }}</v-chip>
                </h6>

                <v-list v-if="credentials.length > 0" density="compact" class="mb-4">
                  <v-list-item v-for="cred in credentials" :key="cred.id" class="bg-grey-lighten-4 rounded-md mb-2 pa-3">
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <span class="text-body-1 font-weight-medium">{{ cred.key_name }}</span>
                        <v-chip size="x-small" color="secondary" class="ml-2">{{ cred.credential_type }}</v-chip>
                      </div>
                      <span class="text-caption text-medium-emphasis">{{ formatDate(cred.created_at) }}</span>
                    </div>
                  </v-list-item>
                </v-list>
                <v-alert v-else type="info" variant="tonal" class="mb-4">No credentials configured yet.</v-alert>

                <v-divider class="mb-4" />
                <h6 class="text-subtitle-2 font-weight-bold mb-3">Add / Update Credential</h6>

                <v-select
                  v-model="credForm.credential_type"
                  :items="credTypes"
                  label="Credential Type"
                  variant="outlined"
                  color="primary"
                  hide-details="auto"
                  class="mb-3"
                />

                <v-text-field
                  v-model="credForm.key_name"
                  label="Key Name"
                  variant="outlined"
                  color="primary"
                  hide-details="auto"
                  placeholder="e.g., developer_key, service_account_json"
                  class="mb-3"
                />

                <v-text-field
                  v-model="credForm.value"
                  label="Value"
                  type="password"
                  variant="outlined"
                  color="primary"
                  hide-details="auto"
                  placeholder="Plaintext — encrypted by backend"
                  class="mb-3"
                />

                <v-btn
                  color="primary"
                  variant="flat"
                  :loading="savingCred"
                  :disabled="!credForm.key_name || !credForm.value"
                  @click="saveCredential"
                >
                  <KeyIcon size="18" stroke-width="1.5" class="mr-1" />
                  Save Credential
                </v-btn>
              </v-col>

              <!-- Test Connection -->
              <v-col cols="12" md="6">
                <h6 class="text-subtitle-1 font-weight-bold mb-3">
                  <PlugConnectedIcon size="18" stroke-width="1.5" class="mr-1" />
                  Test Connection
                </h6>

                <div class="d-flex flex-column ga-4">
                  <v-card variant="outlined" class="pa-4">
                    <div class="d-flex align-center justify-space-between mb-3">
                      <h6 class="text-subtitle-1 font-weight-bold">Google Sheets</h6>
                      <v-btn
                        color="primary"
                        variant="tonal"
                        size="small"
                        :loading="testingSheets"
                        @click="testSheets"
                      >
                        Test Connection
                      </v-btn>
                    </div>
                    <v-alert
                      v-if="sheetsResult"
                      :type="sheetsResult.connected ? 'success' : 'error'"
                      variant="tonal"
                      density="compact"
                    >
                      <div class="d-flex align-center ga-2">
                        <CircleCheckIcon v-if="sheetsResult.connected" size="18" stroke-width="1.5" />
                        <CircleXIcon v-else size="18" stroke-width="1.5" />
                        {{ sheetsResult.message }}
                      </div>
                    </v-alert>
                  </v-card>

                  <v-card variant="outlined" class="pa-4">
                    <div class="d-flex align-center justify-space-between mb-3">
                      <h6 class="text-subtitle-1 font-weight-bold">Open Dental API</h6>
                      <v-btn
                        color="primary"
                        variant="tonal"
                        size="small"
                        :loading="testingOD"
                        @click="testOpenDental"
                      >
                        Test Connection
                      </v-btn>
                    </div>
                    <v-alert
                      v-if="odResult"
                      :type="odResult.connected ? 'success' : 'error'"
                      variant="tonal"
                      density="compact"
                    >
                      <div class="d-flex align-center ga-2">
                        <CircleCheckIcon v-if="odResult.connected" size="18" stroke-width="1.5" />
                        <CircleXIcon v-else size="18" stroke-width="1.5" />
                        {{ odResult.message }}
                      </div>
                    </v-alert>
                  </v-card>
                </div>
              </v-col>
            </v-row>

            <v-divider class="my-6" />

            <!-- Writeback Configuration -->
            <h6 class="text-subtitle-1 font-weight-bold mb-4">
              <ClockIcon size="18" stroke-width="1.5" class="mr-1" />
              Writeback Configuration
            </h6>

            <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="writebackForm.writeback_mode"
                  :items="['automatic', 'manual']"
                  label="Writeback Mode"
                  variant="outlined"
                  color="primary"
                  hide-details="auto"
                >
                  <template v-slot:item="{ item, props: itemProps }">
                    <v-list-item v-bind="itemProps">
                      <template v-slot:prepend>
                        <v-chip
                          :color="item.value === 'automatic' ? 'success' : 'info'"
                          size="x-small"
                          class="mr-2"
                        >
                          {{ item.value === 'automatic' ? 'Auto' : 'Manual' }}
                        </v-chip>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="writebackForm.timezone"
                  :items="timezones"
                  label="Timezone"
                  variant="outlined"
                  color="primary"
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <v-row v-if="writebackForm.writeback_mode === 'automatic'" class="mt-2">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="writebackForm.quiet_start"
                  label="Quiet Start (HH:MM)"
                  type="time"
                  variant="outlined"
                  color="primary"
                  hide-details="auto"
                  placeholder="e.g. 22:00"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="writebackForm.quiet_end"
                  label="Quiet End (HH:MM)"
                  type="time"
                  variant="outlined"
                  color="primary"
                  hide-details="auto"
                  placeholder="e.g. 06:00"
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-alert type="info" variant="tonal" density="compact" class="w-100">
                  Auto-enqueue is paused during quiet hours.
                </v-alert>
              </v-col>
            </v-row>

            <div class="mt-4">
              <v-btn color="primary" variant="flat" :loading="savingWbConfig" @click="saveWritebackConfig">
                <SaveIcon size="18" stroke-width="1.5" class="mr-1" />
                Save Config
              </v-btn>
            </div>
          </v-window-item>

          <!-- Benefits Tab -->
          <v-window-item value="benefits">
            <BenefitMappingsTab :clinic-id="clinicId" />
          </v-window-item>

          <!-- Frequencies Tab -->
          <v-window-item value="frequencies">
            <FrequencyMappingsTab :clinic-id="clinicId" />
          </v-window-item>

          <!-- Age Limits Tab -->
          <v-window-item value="age-limits">
            <AgeLimitMappingsTab :clinic-id="clinicId" />
          </v-window-item>

          <!-- Pipeline Tab -->
          <v-window-item value="pipeline">
            <PipelineStepsTab :clinic-id="clinicId" :client-id="currentClinic?.client_id" />
          </v-window-item>
        </v-window>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarMsg }}
  </v-snackbar>
</template>
