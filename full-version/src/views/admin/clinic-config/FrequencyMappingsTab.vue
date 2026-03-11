<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useClinicStore } from '@/stores/clinics';
import { PlusIcon, TrashIcon, DeviceFloppyIcon as SaveIcon } from 'vue-tabler-icons';

const props = defineProps<{ clinicId: string }>();
const clinicStore = useClinicStore();

interface FreqRow {
  id?: string;
  proc_code: string;
  bookmark_name: string;
  proc_type: string;
  target_id: number | null;
}

const rows = ref<FreqRow[]>([]);
const loadingData = ref(true);
const saving = ref(false);
const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');

const procTypeOptions = ['code_group', 'codenum', 'covcatnum'];

async function loadData() {
  loadingData.value = true;
  try {
    const data = await clinicStore.fetchFrequencyMappings(props.clinicId);
    rows.value = Array.isArray(data) ? data.map((d: any) => ({
      id: d.id,
      proc_code: d.proc_code || '',
      bookmark_name: d.bookmark_name || '',
      proc_type: d.proc_type || 'code_group',
      target_id: d.target_id ?? null,
    })) : [];
  } catch {
    rows.value = [];
  } finally {
    loadingData.value = false;
  }
}

function addRow() {
  rows.value.push({ proc_code: '', bookmark_name: '', proc_type: 'code_group', target_id: null });
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
}

async function save() {
  saving.value = true;
  try {
    await clinicStore.saveFrequencyMappings(props.clinicId, rows.value);
    snackbarMsg.value = 'Frequency mappings saved';
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
      <h6 class="text-h6 font-weight-bold">Frequency Mappings</h6>
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

    <v-progress-circular v-if="loadingData" indeterminate color="primary" class="d-block mx-auto my-6" />

    <template v-else>
      <v-alert v-if="rows.length === 0" type="info" variant="tonal" class="mb-4">
        No frequency mappings configured. Click "+ Add" to create one.
      </v-alert>

      <v-table v-else density="comfortable" class="rounded-lg border">
        <thead>
          <tr>
            <th>Proc Code</th>
            <th>Bookmark Name</th>
            <th>Proc Type</th>
            <th>Target ID</th>
            <th class="text-center" style="width: 60px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in rows" :key="idx">
            <td>
              <v-text-field
                v-model="row.proc_code"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="D0274group"
              />
            </td>
            <td>
              <v-text-field
                v-model="row.bookmark_name"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="D0274frequency"
              />
            </td>
            <td>
              <v-select
                v-model="row.proc_type"
                :items="procTypeOptions"
                variant="outlined"
                density="compact"
                hide-details
              />
            </td>
            <td>
              <v-text-field
                v-model.number="row.target_id"
                type="number"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="1"
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
