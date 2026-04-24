<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useClientStore } from '@/stores/clients';
import { useExtractionStore } from '@/stores/extraction';
import type { InsuranceEnrichmentClinicConfigRow, InsuranceEnrichmentConfigShape } from '@/types/extraction';

const extractionStore = useExtractionStore();
const clientStore = useClientStore();

const { clients } = storeToRefs(clientStore);
const { loading, insuranceEnrichmentConfig, insuranceEnrichmentPreview } = storeToRefs(extractionStore);

const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Extraction', disabled: false, href: '/main/extraction' },
  { title: 'Insurance Enrichment', disabled: true, href: '#' },
]);

const selectedClientId = ref('');
const selectedClinicIdForPreview = ref('');
const previewDate = ref(new Date().toISOString().slice(0, 10));
const previewRunType = ref<'NEW_DATE' | 'REVIEW'>('NEW_DATE');

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

const clinicDialogOpen = ref(false);
const selectedClinicRow = ref<InsuranceEnrichmentClinicConfigRow | null>(null);
const clinicOverrideEnabled = ref(false);

const fieldOptions = [
  { key: 'carrier_name', label: 'Carrier Name' },
  { key: 'member_id', label: 'Member ID' },
  { key: 'subscriber_fname', label: 'Subscriber First Name' },
  { key: 'subscriber_lname', label: 'Subscriber Last Name' },
  { key: 'subscriber_dob', label: 'Subscriber DOB' },
  { key: 'subscriber_zip', label: 'Subscriber ZIP' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'subscriber_patnum', label: 'Subscriber PatNum' },
  { key: 'group_number', label: 'Group Number' },
  { key: 'group_name', label: 'Group Name' },
  { key: 'verification_type', label: 'Verification Type' },
  { key: 'file_name', label: 'File Name' },
] as const;

const clinicHeaders = [
  { title: 'Clinic', key: 'clinic_name', sortable: false },
  { title: 'Effective Status', key: 'effective_status', sortable: false },
  { title: 'Settings / Inheritance', key: 'inheritance', sortable: false },
  { title: 'Configure', key: 'actions', sortable: false, align: 'center' as const },
];

const sampleHeaders = [
  { title: 'Patient', key: 'patient_id', sortable: false },
  { title: 'Field', key: 'field', sortable: false },
  { title: 'Before', key: 'before', sortable: false },
  { title: 'After', key: 'after', sortable: false },
  { title: 'Source', key: 'source', sortable: false },
];

const auditHeaders = [
  { title: 'Time', key: 'created_at', sortable: false },
  { title: 'Clinic', key: 'clinic_name', sortable: false },
  { title: 'Mode', key: 'mode', sortable: false },
  { title: 'Rows', key: 'rows_seen', sortable: false },
  { title: 'Enriched', key: 'rows_enriched', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
];

const clientItems = computed(() => clients.value.map((client) => ({
  title: client.client_name,
  value: client.id,
})));

const clinicItems = computed(() => (insuranceEnrichmentConfig.value?.clinics ?? []).map((row) => ({
  title: row.clinic_name,
  value: row.clinic_id,
})));

const clientForm = ref<InsuranceEnrichmentConfigShape>({
  enabled: false,
  application_mode: 'preview',
  gemini_enabled: false,
  gemini_model: 'gemini-3.1-flash-lite-preview',
  gemini_only_when_parser_incomplete: true,
  max_gemini_calls_per_run: 25,
  apply_only_when_carrier_generic: true,
  set_verification_type_on_enrichment: true,
  verification_type_value: 'FBD',
  update_filenames: true,
  fields_applied: {
    carrier_name: true,
    member_id: true,
    subscriber_fname: true,
    subscriber_lname: true,
    subscriber_dob: true,
    subscriber_zip: true,
    relationship: true,
    subscriber_patnum: true,
    group_number: true,
    group_name: true,
    verification_type: true,
    file_name: true,
  },
});

const clinicOverrideForm = ref<Partial<InsuranceEnrichmentConfigShape>>({
  enabled: false,
  application_mode: 'preview',
  gemini_enabled: false,
  gemini_only_when_parser_incomplete: true,
  max_gemini_calls_per_run: 25,
  apply_only_when_carrier_generic: true,
  set_verification_type_on_enrichment: true,
  verification_type_value: 'FBD',
  update_filenames: true,
  fields_applied: {},
});

const previewSummaryRows = computed(() => {
  const result = insuranceEnrichmentPreview.value;
  if (!result) return [];
  return [
    { label: 'Rows scanned', value: result.rows_seen },
    { label: 'Candidate rows', value: result.candidate_rows },
    { label: 'Rows enriched', value: result.rows_enriched },
    { label: 'Gemini calls', value: result.gemini_calls },
    { label: 'Source counts', value: Object.entries(result.sources).map(([key, value]) => `${key}:${value}`).join(', ') || '—' },
  ];
});

const sampleRows = computed(() => {
  const result = insuranceEnrichmentPreview.value;
  if (!result) return [];
  return result.sample_changes.flatMap((sample) =>
    Object.entries(sample.fields).map(([field, values]) => ({
      patient_id: sample.patient_id,
      field,
      before: values.before,
      after: values.after,
      source: sample.sources?.join(', ') || 'mixed',
    }))
  );
});

function showSnack(message: string, color: string) {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

function syncClientFormFromConfig() {
  const cfg = insuranceEnrichmentConfig.value?.effective_client_config;
  if (!cfg) return;
  clientForm.value = JSON.parse(JSON.stringify(cfg));
}

async function loadConfig() {
  if (!selectedClientId.value) return;
  await extractionStore.fetchInsuranceEnrichmentConfig(selectedClientId.value);
  syncClientFormFromConfig();
  if (!selectedClinicIdForPreview.value && clinicItems.value.length > 0) {
    selectedClinicIdForPreview.value = clinicItems.value[0].value;
  }
}

async function saveClientConfig() {
  if (!selectedClientId.value) return;
  await extractionStore.updateInsuranceEnrichmentClientConfig(selectedClientId.value, clientForm.value as Record<string, unknown>);
  syncClientFormFromConfig();
  showSnack('Insurance enrichment client config updated.', 'success');
}

function openClinicDialog(row: InsuranceEnrichmentClinicConfigRow) {
  selectedClinicRow.value = row;
  clinicDialogOpen.value = true;
  clinicOverrideEnabled.value = row.has_override;
  clinicOverrideForm.value = {
    enabled: row.clinic_override?.enabled ?? row.effective_config.enabled,
    application_mode: row.clinic_override?.application_mode ?? row.effective_config.application_mode,
    gemini_enabled: row.clinic_override?.gemini_enabled ?? row.effective_config.gemini_enabled,
    gemini_only_when_parser_incomplete: row.clinic_override?.gemini_only_when_parser_incomplete ?? row.effective_config.gemini_only_when_parser_incomplete,
    max_gemini_calls_per_run: row.clinic_override?.max_gemini_calls_per_run ?? row.effective_config.max_gemini_calls_per_run,
    apply_only_when_carrier_generic: row.clinic_override?.apply_only_when_carrier_generic ?? row.effective_config.apply_only_when_carrier_generic,
    set_verification_type_on_enrichment: row.clinic_override?.set_verification_type_on_enrichment ?? row.effective_config.set_verification_type_on_enrichment,
    verification_type_value: row.clinic_override?.verification_type_value ?? row.effective_config.verification_type_value,
    update_filenames: row.clinic_override?.update_filenames ?? row.effective_config.update_filenames,
    fields_applied: row.clinic_override?.fields_applied ?? {},
  };
}

async function saveClinicOverride() {
  if (!selectedClinicRow.value) return;
  const clinicId = selectedClinicRow.value.clinic_id;
  if (!clinicOverrideEnabled.value) {
    await extractionStore.updateInsuranceEnrichmentClinicOverride(clinicId, { inherit_all: true });
    showSnack('Clinic override removed. Inheriting client config.', 'success');
    clinicDialogOpen.value = false;
    return;
  }

  await extractionStore.updateInsuranceEnrichmentClinicOverride(clinicId, {
    enabled: clinicOverrideForm.value.enabled,
    application_mode: clinicOverrideForm.value.application_mode,
    gemini_enabled: clinicOverrideForm.value.gemini_enabled,
    gemini_only_when_parser_incomplete: clinicOverrideForm.value.gemini_only_when_parser_incomplete,
    max_gemini_calls_per_run: clinicOverrideForm.value.max_gemini_calls_per_run,
    apply_only_when_carrier_generic: clinicOverrideForm.value.apply_only_when_carrier_generic,
    set_verification_type_on_enrichment: clinicOverrideForm.value.set_verification_type_on_enrichment,
    verification_type_value: clinicOverrideForm.value.verification_type_value,
    update_filenames: clinicOverrideForm.value.update_filenames,
    fields_applied: clinicOverrideForm.value.fields_applied,
  });
  showSnack('Clinic override saved.', 'success');
  clinicDialogOpen.value = false;
}

async function runPreview() {
  if (!selectedClinicIdForPreview.value) {
    showSnack('Select clinic before running preview.', 'warning');
    return;
  }
  await extractionStore.runInsuranceEnrichmentPreview({
    clinic_id: selectedClinicIdForPreview.value,
    target_date: previewDate.value,
    run_type: previewRunType.value,
  });
  showSnack('Preview completed.', 'success');
}

onMounted(async () => {
  await clientStore.fetchClients({ limit: 500, includeInactive: true });
});

watch(selectedClientId, async (value) => {
  if (!value) return;
  await loadConfig();
});
</script>

<template>
  <BaseBreadcrumb title="Insurance Enrichment" :breadcrumbs="breadcrumbs" />

  <v-row>
    <v-col cols="12">
      <UiParentCard title="Insurance Enrichment">
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedClientId"
              :items="clientItems"
              item-title="title"
              item-value="value"
              label="Client"
              variant="outlined"
              color="primary"
              hide-details="auto"
              clearable
            />
          </v-col>
        </v-row>
        <v-alert type="info" variant="tonal" class="mt-4">
          Enriches insurance fields before Sheet write. Uses parser-first logic with optional Gemini fallback.
        </v-alert>
      </UiParentCard>
    </v-col>

    <v-col cols="12" v-if="insuranceEnrichmentConfig">
      <UiParentCard title="Client Configuration">
        <v-row>
          <v-col cols="12" md="6">
            <v-switch v-model="clientForm.enabled" color="primary" hide-details="auto" label="Enabled" />
          </v-col>
          <v-col cols="12" md="6">
            <v-radio-group v-model="clientForm.application_mode" hide-details="auto" color="primary" inline>
              <v-radio label="Preview only — do not apply enrichment" value="preview" />
              <v-radio label="Apply enrichment before writing to Sheet" value="apply" />
            </v-radio-group>
          </v-col>

          <v-col cols="12">
            <div class="text-subtitle-1 mb-2">Fields Applied</div>
            <v-row>
              <v-col v-for="item in fieldOptions" :key="item.key" cols="12" md="4">
                <v-checkbox
                  v-model="clientForm.fields_applied[item.key]"
                  :label="item.label"
                  color="primary"
                  hide-details="auto"
                />
              </v-col>
            </v-row>
          </v-col>

          <v-col cols="12">
            <UiParentCard title="Gemini Fallback">
              <v-row>
                <v-col cols="12" md="4">
                  <v-switch v-model="clientForm.gemini_enabled" label="Enable Gemini fallback" color="primary" hide-details="auto" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="clientForm.max_gemini_calls_per_run"
                    type="number"
                    min="0"
                    label="Max Gemini calls per run"
                    variant="outlined"
                    color="primary"
                    hide-details="auto"
                  />
                </v-col>
                <v-col cols="12">
                  <v-checkbox
                    v-model="clientForm.gemini_only_when_parser_incomplete"
                    label="Only use Gemini when note parsing is incomplete"
                    color="primary"
                    hide-details="auto"
                  />
                </v-col>
              </v-row>
            </UiParentCard>
          </v-col>

          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="primary" :loading="loading" @click="saveClientConfig">Save Client Config</v-btn>
          </v-col>
        </v-row>
      </UiParentCard>
    </v-col>

    <v-col cols="12" v-if="insuranceEnrichmentConfig">
      <UiParentCard title="Clinic-specific settings">
        <v-data-table :headers="clinicHeaders" :items="insuranceEnrichmentConfig.clinics" :items-per-page="25" hover>
          <template #item.effective_status="{ item }">
            <v-chip :color="item.effective_status === 'enabled' ? 'success' : 'warning'" size="small" variant="flat">
              {{ item.effective_status }}
            </v-chip>
          </template>
          <template #item.inheritance="{ item }">
            <span class="text-medium-emphasis">{{ item.inheritance.source }} · {{ item.inheritance.application_mode }}</span>
          </template>
          <template #item.actions="{ item }">
            <v-btn size="small" variant="tonal" color="primary" @click="openClinicDialog(item)">Configure</v-btn>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>

    <v-col cols="12" v-if="insuranceEnrichmentConfig">
      <UiParentCard title="Test Enrichment">
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedClinicIdForPreview"
              :items="clinicItems"
              item-title="title"
              item-value="value"
              label="Clinic"
              variant="outlined"
              color="primary"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="previewDate"
              label="Date"
              type="date"
              variant="outlined"
              color="primary"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="previewRunType"
              :items="['NEW_DATE', 'REVIEW']"
              label="Run type"
              variant="outlined"
              color="primary"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" class="d-flex ga-2">
            <v-btn color="primary" :loading="loading" @click="runPreview">Run Preview</v-btn>
            <v-btn color="secondary" variant="tonal" disabled>Run Real Canary (TODO)</v-btn>
          </v-col>
        </v-row>
      </UiParentCard>
    </v-col>

    <v-col cols="12" v-if="insuranceEnrichmentPreview">
      <UiParentCard title="Preview Result">
        <v-list density="compact">
          <v-list-item v-for="item in previewSummaryRows" :key="item.label" :title="item.label" :subtitle="String(item.value)" />
        </v-list>
      </UiParentCard>
    </v-col>

    <v-col cols="12" v-if="insuranceEnrichmentPreview">
      <UiParentCard title="Sample Changes">
        <v-data-table :headers="sampleHeaders" :items="sampleRows" :items-per-page="10" />
      </UiParentCard>
    </v-col>

    <v-col cols="12" v-if="insuranceEnrichmentConfig">
      <UiParentCard title="Audit Trail">
        <v-data-table :headers="auditHeaders" :items="insuranceEnrichmentConfig.audit_trail" :items-per-page="10" />
      </UiParentCard>
    </v-col>
  </v-row>

  <v-dialog v-model="clinicDialogOpen" max-width="900">
    <v-card>
      <v-card-title>Clinic Override</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-switch v-model="clinicOverrideEnabled" label="Enable clinic-specific override" color="primary" hide-details="auto" />
          </v-col>
          <template v-if="clinicOverrideEnabled">
            <v-col cols="12" md="6">
              <v-switch v-model="clinicOverrideForm.enabled" label="Enabled" color="primary" hide-details="auto" />
            </v-col>
            <v-col cols="12" md="6">
              <v-radio-group v-model="clinicOverrideForm.application_mode" inline hide-details="auto" color="primary">
                <v-radio label="Preview only — do not apply enrichment" value="preview" />
                <v-radio label="Apply enrichment before writing to Sheet" value="apply" />
              </v-radio-group>
            </v-col>
            <v-col cols="12" md="6">
              <v-switch v-model="clinicOverrideForm.gemini_enabled" label="Enable Gemini fallback" color="primary" hide-details="auto" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="clinicOverrideForm.max_gemini_calls_per_run"
                type="number"
                min="0"
                label="Max Gemini calls per run"
                variant="outlined"
                color="primary"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="clinicOverrideForm.gemini_only_when_parser_incomplete"
                label="Only use Gemini when note parsing is incomplete"
                color="primary"
                hide-details="auto"
              />
            </v-col>
          </template>
        </v-row>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="clinicDialogOpen = false">Cancel</v-btn>
        <v-btn color="primary" @click="saveClinicOverride">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="2500">
    {{ snackbarText }}
  </v-snackbar>
</template>
