<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useClinicStore } from '@/stores/clinics';
import { PlusIcon, TrashIcon, DeviceFloppyIcon as SaveIcon } from 'vue-tabler-icons';

const props = defineProps<{ clinicId: string }>();
const clinicStore = useClinicStore();

interface BenefitRow {
  id?: string;
  mapping_type: string;
  source_key: string;
  bookmark_name: string;
  target_id: number | null;
  target_type: string;
}

const allRows = ref<BenefitRow[]>([]);
const filteredRows = ref<BenefitRow[]>([]);
const selectedType = ref('category');
const loadingData = ref(true);
const saving = ref(false);
const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');

const mappingTypeOptions = ['category', 'code', 'code_diff', 'force_zero_cat', 'force_zero_code'];
const targetTypeOptions = ['covcatnum', 'codenum', 'code_group'];

function filterRows() {
  filteredRows.value = allRows.value.filter(r => r.mapping_type === selectedType.value);
}

watch(selectedType, filterRows);

async function loadData() {
  loadingData.value = true;
  try {
    const data = await clinicStore.fetchBenefitMappings(props.clinicId);
    allRows.value = Array.isArray(data) ? data.map((d: any) => ({
      id: d.id,
      mapping_type: d.mapping_type || 'category',
      source_key: d.source_key || '',
      bookmark_name: d.bookmark_name || '',
      target_id: d.target_id ?? null,
      target_type: d.target_type || 'covcatnum',
    })) : [];
    filterRows();
  } catch {
    allRows.value = [];
    filteredRows.value = [];
  } finally {
    loadingData.value = false;
  }
}

function addRow() {
  const newRow: BenefitRow = {
    mapping_type: selectedType.value,
    source_key: '',
    bookmark_name: '',
    target_id: null,
    target_type: 'covcatnum',
  };
  allRows.value.push(newRow);
  filterRows();
}

function removeRow(index: number) {
  const item = filteredRows.value[index];
  const allIdx = allRows.value.indexOf(item);
  if (allIdx !== -1) allRows.value.splice(allIdx, 1);
  filterRows();
}

async function save() {
  saving.value = true;
  try {
    await clinicStore.saveBenefitMappings(props.clinicId, selectedType.value, filteredRows.value);
    snackbarMsg.value = `${selectedType.value} mappings saved`;
    snackbarColor.value = 'success';
  } catch (e: any) {
    snackbarMsg.value = e.message || 'Failed to save';
    snackbarColor.value = 'error';
  } finally {
    saving.value = false;
    snackbar.value = true;
  }
}

onMounted(loadData);
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <h6 class="text-h6 font-weight-bold">Benefit Mappings</h6>
      <div class="d-flex ga-2">
        <v-btn color="primary" variant="tonal" size="small" @click="addRow">
          <PlusIcon size="16" stroke-width="1.5" class="mr-1" />
          Add
        </v-btn>
        <v-btn color="primary" variant="flat" size="small" :loading="saving" @click="save">
          <SaveIcon size="16" stroke-width="1.5" class="mr-1" />
          Save
        </v-btn>
      </div>
    </div>

    <v-select
      v-model="selectedType"
      :items="mappingTypeOptions"
      label="Mapping Type"
      variant="outlined"
      color="primary"
      density="compact"
      hide-details
      class="mb-4"
      style="max-width: 260px"
    />

    <v-progress-circular v-if="loadingData" indeterminate color="primary" class="d-block mx-auto my-6" />

    <template v-else>
      <v-alert v-if="filteredRows.length === 0" type="info" variant="tonal" class="mb-4">
        No {{ selectedType }} mappings configured. Click "+ Add" to create one.
      </v-alert>

      <v-table v-else density="comfortable" class="rounded-lg border">
        <thead>
          <tr>
            <th>Source Key</th>
            <th>Bookmark Name</th>
            <th>Target ID</th>
            <th>Target Type</th>
            <th class="text-center" style="width: 60px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in filteredRows" :key="idx">
            <td>
              <v-text-field
                v-model="row.source_key"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="Diagnostic"
              />
            </td>
            <td>
              <v-text-field
                v-model="row.bookmark_name"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="Diagnostic"
              />
            </td>
            <td>
              <v-text-field
                v-model.number="row.target_id"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="10"
              />
            </td>
            <td>
              <v-select
                v-model="row.target_type"
                :items="targetTypeOptions"
                variant="outlined"
                density="compact"
                hide-details
              />
            </td>
            <td class="text-center">
              <v-btn icon variant="text" color="error" size="small" @click="removeRow(idx)">
                <TrashIcon size="16" stroke-width="1.5" />
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </template>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000" location="bottom right">
      {{ snackbarMsg }}
    </v-snackbar>
  </div>
</template>
