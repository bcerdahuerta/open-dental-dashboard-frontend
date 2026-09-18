<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useClientStore, type ClientCreate } from '@/stores/clients';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import ClientAutomationsPanel from '@/components/admin/ClientAutomationsPanel.vue';
import { PlusIcon, PencilIcon, BuildingIcon } from 'vue-tabler-icons';

const router = useRouter();
const clientStore = useClientStore();
const { clients, loading, error } = storeToRefs(clientStore);

const page = ref({ title: 'Client Management' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Client Management', disabled: true, href: '#' }
]);

const dialog = ref(false);
const editMode = ref(false);
const editClientId = ref<string | null>(null);
const valid = ref(false);
const snackbar = ref(false);
const snackbarMsg = ref('');
const snackbarColor = ref('success');

const productTypes = ['Lunna', 'Diva', 'Custom'];

const formData = ref<ClientCreate>({
  client_name: '',
  product_type: 'Lunna',
  slack_webhook: '',
  slack_qa_ids: '',
  days_in_advance: 3
});

const headers = [
  { title: 'Client Name', key: 'client_name', sortable: true },
  { title: 'Product', key: 'product_type', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Days Advance', key: 'days_in_advance', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const }
];

function showSnackbar(msg: string, color: string) {
  snackbarMsg.value = msg;
  snackbarColor.value = color;
  snackbar.value = true;
}

function resetForm() {
  formData.value = {
    client_name: '',
    product_type: 'Lunna',
    slack_webhook: '',
    slack_qa_ids: '',
    days_in_advance: 3
  };
  editMode.value = false;
  editClientId.value = null;
}

function openEdit(item: any) {
  editMode.value = true;
  editClientId.value = item.id;
  formData.value = {
    client_name: item.client_name || '',
    product_type: item.product_type || 'Lunna',
    slack_webhook: item.slack_webhook || '',
    slack_qa_ids: item.slack_qa_ids || '',
    days_in_advance: item.days_in_advance || 3
  };
  dialog.value = true;
}

async function saveClient() {
  if (!valid.value) return;
  try {
    const payload: any = { ...formData.value };
    // Clean empty strings to null
    if (!payload.slack_webhook) delete payload.slack_webhook;
    if (!payload.slack_qa_ids) delete payload.slack_qa_ids;

    if (editMode.value && editClientId.value) {
      await clientStore.updateClient(editClientId.value, payload);
      showSnackbar('Client updated successfully', 'success');
    } else {
      await clientStore.createClient(payload);
      showSnackbar('Client created successfully', 'success');
    }
    dialog.value = false;
    resetForm();
  } catch (err: any) {
    showSnackbar(err.message || 'Failed to save client', 'error');
  }
}

function viewClinics(item: any) {
  router.push({ path: '/admin/clinics', query: { client_id: item.id } });
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

onMounted(() => {
  clientStore.fetchClients();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Clients">
        <template v-slot:action>
          <v-btn color="primary" variant="flat" @click="router.push('/admin/onboarding')">
            <PlusIcon size="18" stroke-width="1.5" class="mr-1" />
            Invite client
          </v-btn>
        </template>
        
        <v-alert v-if="error" type="error" class="mb-4" variant="tonal" closable @click:close="error = null">{{ error }}</v-alert>

        <v-data-table
          :headers="headers"
          :items="clients"
          :loading="loading"
          item-value="id"
          class="border rounded-md"
          density="comfortable"
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
            <div class="d-flex justify-center ga-2">
              <v-btn color="primary" variant="tonal" size="small" @click="openEdit(item)">
                <PencilIcon size="16" stroke-width="1.5" class="mr-1" />
                Edit
              </v-btn>
              <v-btn color="secondary" variant="tonal" size="small" @click="viewClinics(item)">
                <BuildingIcon size="16" stroke-width="1.5" class="mr-1" />
                Clinics
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
    <v-col cols="12">
      <ClientAutomationsPanel />
    </v-col>
  </v-row>

  <!-- Add/Edit Dialog -->
  <v-dialog v-model="dialog" max-width="600" persistent>
    <v-card>
      <v-card-title class="text-h5 bg-lightprimary pa-4">
        {{ 'Edit Client' }}
      </v-card-title>
      <v-card-text class="pa-4">
        <v-form v-model="valid" @submit.prevent="saveClient">
          <v-text-field
            v-model="formData.client_name"
            label="Client Name"
            :rules="[(v: string) => !!v || 'Client name is required']"
            required
            variant="outlined"
            color="primary"
            hide-details="auto"
            class="mb-4"
          />

          <v-select
            v-model="formData.product_type"
            :items="productTypes"
            label="Product Type"
            :rules="[(v: string) => !!v || 'Product type is required']"
            required
            variant="outlined"
            color="primary"
            hide-details="auto"
            class="mb-4"
          />

          <v-text-field
            v-model="formData.slack_webhook"
            label="Slack Webhook URL"
            variant="outlined"
            color="primary"
            hide-details="auto"
            placeholder="https://hooks.slack.com/..."
            class="mb-4"
          />

          <v-text-field
            v-model="formData.slack_qa_ids"
            label="Slack QA User IDs"
            variant="outlined"
            color="primary"
            hide-details="auto"
            placeholder="U01ABC,U02DEF"
            class="mb-4"
          />

          <v-text-field
            v-model.number="formData.days_in_advance"
            label="Days in Advance"
            type="number"
            :rules="[
              (v: number) => (v >= 1 && v <= 30) || 'Must be between 1 and 30'
            ]"
            variant="outlined"
            color="primary"
            hide-details="auto"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn color="secondary" variant="tonal" @click="dialog = false; resetForm()">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!valid" :loading="loading" @click="saveClient">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbar -->
  <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom right">
    {{ snackbarMsg }}
  </v-snackbar>
</template>
