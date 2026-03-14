<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useClientStore } from '@/stores/clients';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { PencilIcon, PlusIcon } from 'vue-tabler-icons';

const clientStore = useClientStore();
const apiUrl = import.meta.env.VITE_API_URL;

const page = ref({ title: 'Template Management' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Template Management', disabled: true, href: '#' }
]);

const selectedClientId = ref<string | null>(null);
const templates = ref<any[]>([]);
const loading = ref(false);

const headers = [
  { title: 'Template Name', key: 'template_name', sortable: true },
  { title: 'Type', key: 'template_type', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const }
];

async function loadTemplates() {
  if (!selectedClientId.value) {
    templates.value = [];
    return;
  }
  loading.value = true;
  try {
    templates.value = await fetchWrapper.get(`${apiUrl}/clients/${selectedClientId.value}/templates`);
  } catch (error) {
    templates.value = [];
  } finally {
    loading.value = false;
  }
}

watch(selectedClientId, loadTemplates);

onMounted(async () => {
  await clientStore.fetchClients();
});

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Note Templates">
        <template v-slot:action>
          <div style="width: 250px;">
            <v-select
              v-model="selectedClientId"
              :items="clientStore.clients"
              item-title="client_name"
              item-value="id"
              label="Select Client"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details
            />
          </div>
        </template>

        <v-alert v-if="!selectedClientId" type="info" variant="tonal" class="mb-4">
          Please select a client to view note templates.
        </v-alert>

        <v-data-table
          v-else
          :headers="headers"
          :items="templates"
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
              <v-btn color="primary" variant="tonal" size="small" disabled>
                <PencilIcon size="16" stroke-width="1.5" class="mr-1" />
                Edit
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
