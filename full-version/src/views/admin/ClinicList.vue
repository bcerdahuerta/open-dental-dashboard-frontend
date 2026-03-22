<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useClinicStore, type ClinicCreate } from '@/stores/clinics';
import { useClientStore } from '@/stores/clients';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { PlusIcon, SettingsIcon, LockIcon } from 'vue-tabler-icons';

const route = useRoute();
const router = useRouter();
const clinicStore = useClinicStore();
const clientStore = useClientStore();
const { clinics, loading, error } = storeToRefs(clinicStore);
const { clients } = storeToRefs(clientStore);

const selectedClientId = ref<string | null>((route.query.client_id as string) || null);
const dialog = ref(false);
const valid = ref(false);
const saving = ref(false);
const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');
const showCustomerKey = ref(false);

const formData = ref<ClinicCreate>({
  client_id: '',
  clinic_name: '',
  ccc_clinic_id: '',
  spreadsheet_id: '',
  customer_key: '',
});

const headers = [
  { title: 'Clinic Name', key: 'clinic_name', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const }
];

function showSnackbar(msg: string, color: string) {
  snackbarMsg.value = msg;
  snackbarColor.value = color;
  snackbar.value = true;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function openAdd() {
  formData.value = {
    client_id: selectedClientId.value || '',
    clinic_name: '',
    ccc_clinic_id: '',
    spreadsheet_id: '',
    customer_key: '',
  };
  showCustomerKey.value = false;
  dialog.value = true;
}

async function saveClinic() {
  if (!valid.value) return;
  saving.value = true;
  try {
    // Build clinic payload (exclude OD credential fields)
    const payload: any = {
      client_id: formData.value.client_id,
      clinic_name: formData.value.clinic_name,
    };
    if (formData.value.ccc_clinic_id) payload.ccc_clinic_id = formData.value.ccc_clinic_id;
    if (formData.value.spreadsheet_id) payload.spreadsheet_id = formData.value.spreadsheet_id;

    const newClinic = await clinicStore.createClinic(payload);
    const newClinicId = newClinic.id;

    // Auto-save OD credentials silently
    if (formData.value.customer_key) {
      // Developer key — universal, never shown in UI
      await clinicStore.upsertCredential(newClinicId, {
        credential_type: 'opendental_api',
        key_name: 'developer_key',
        value: 'Y1vEmpYZfv85ipRR'
      });
      // Customer key from user input
      await clinicStore.upsertCredential(newClinicId, {
        credential_type: 'opendental_api',
        key_name: 'customer_key',
        value: formData.value.customer_key
      });
    }
    // Base URL — always the same, hardcoded
    await clinicStore.upsertCredential(newClinicId, {
      credential_type: 'opendental_api',
      key_name: 'base_url',
      value: 'https://api.opendental.com/api/v1'
    });

    dialog.value = false;
    showSnackbar('Clinic created successfully', 'success');
  } catch (err: any) {
    showSnackbar(err.message || 'Failed to create clinic', 'error');
  } finally {
    saving.value = false;
  }
}

function configureClinic(item: any) {
  router.push({ path: `/admin/clinics/${item.id}` });
}

onMounted(() => {
  if (clients.value.length === 0) {
    clientStore.fetchClients();
  }
  if (selectedClientId.value) {
    clinicStore.fetchClinics(selectedClientId.value);
  }
});

watch(selectedClientId, (newVal) => {
  if (newVal) {
    clinicStore.fetchClinics(newVal);
  } else {
    clinics.value = [];
  }
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Clinic Management">
        <template v-slot:action>
          <div class="d-flex align-center ga-4">
            <v-select
              v-model="selectedClientId"
              :items="clients"
              item-title="client_name"
              item-value="id"
              label="Select Client"
              variant="outlined"
              color="primary"
              hide-details
              density="compact"
              style="min-width: 250px"
            />
            <v-btn color="primary" variant="flat" :disabled="!selectedClientId" @click="openAdd">
              <PlusIcon size="18" stroke-width="1.5" class="mr-1" />
              Add Clinic
            </v-btn>
          </div>
        </template>
        
        <v-alert v-if="error" type="error" class="mb-4" variant="tonal" closable @click:close="error = null">{{ error }}</v-alert>

        <v-data-table
          :headers="headers"
          :items="clinics"
          :loading="loading"
          item-value="id"
          class="border rounded-md"
          density="comfortable"
          no-data-text="Select a client to view clinics"
        >
          <template v-slot:item.is_active="{ item }">
            <v-chip
              :color="item.is_active ? 'success' : 'error'"
              :class="item.is_active ? 'bg-lightsuccess' : 'bg-lighterror'"
              size="small"
            >
              {{ item.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </template>
          <template v-slot:item.created_at="{ item }">
            <span class="text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn color="primary" variant="tonal" size="small" @click="configureClinic(item)">
              <SettingsIcon size="16" stroke-width="1.5" class="mr-1" />
              Configure
            </v-btn>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Add Clinic Dialog -->
  <v-dialog v-model="dialog" max-width="600" persistent>
    <v-card>
      <v-card-title class="text-h5 bg-lightprimary pa-4">Add New Clinic</v-card-title>
      <v-card-text class="pa-4">
        <v-form v-model="valid" @submit.prevent="saveClinic">
          <v-select
            v-model="formData.client_id"
            :items="clients"
            item-title="client_name"
            item-value="id"
            label="Client"
            :rules="[(v: string) => !!v || 'Client is required']"
            required
            variant="outlined"
            color="primary"
            hide-details="auto"
            class="mb-4"
          />

          <v-text-field
            v-model="formData.clinic_name"
            label="Clinic Name"
            :rules="[(v: string) => !!v || 'Clinic name is required']"
            required
            variant="outlined"
            color="primary"
            hide-details="auto"
            class="mb-4"
          />

          <v-text-field
            v-model="formData.ccc_clinic_id"
            label="CCC Clinic ID"
            variant="outlined"
            color="primary"
            hide-details="auto"
            placeholder="CCC clinic identifier (optional)"
            class="mb-4"
          />

          <v-text-field
            v-model="formData.spreadsheet_id"
            label="Spreadsheet ID"
            variant="outlined"
            color="primary"
            hide-details="auto"
            placeholder="Override (inherits from client)"
            class="mb-4"
          />

          <v-divider class="my-4" />

          <h4 class="text-h6 d-flex align-center mb-3">
            <LockIcon size="18" stroke-width="1.5" class="mr-2 text-primary" />
            OD API Connection
          </h4>

          <v-text-field
            v-model="formData.customer_key"
            label="Customer Key"
            :type="showCustomerKey ? 'text' : 'password'"
            :append-inner-icon="showCustomerKey ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showCustomerKey = !showCustomerKey"
            :rules="[(v: string) => !!v || 'Customer Key is required for OD API']"
            required
            variant="outlined"
            color="primary"
            hide-details="auto"
            placeholder="Paste customer key from OD"
            class="mb-4"
          />


        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn color="secondary" variant="tonal" @click="dialog = false">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!valid" :loading="saving" @click="saveClinic">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarMsg }}
  </v-snackbar>
</template>
