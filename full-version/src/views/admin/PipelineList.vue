<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useClientStore } from '@/stores/clients';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { EyeIcon, PlusIcon } from 'vue-tabler-icons';

const router = useRouter();
const clientStore = useClientStore();
const apiUrl = import.meta.env.VITE_API_URL;

const page = ref({ title: 'Pipeline Management' });
const breadcrumbs = ref([
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Pipeline Management', disabled: true, href: '#' }
]);

const selectedClientId = ref<string | null>(null);
const profiles = ref<any[]>([]);
const loading = ref(false);

const headers = [
  { title: 'Profile Name', key: 'profile_name', sortable: true },
  { title: 'Default', key: 'is_default', sortable: true },
  { title: 'Steps', key: 'steps_count', sortable: true },
  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const }
];

async function loadProfiles() {
  if (!selectedClientId.value) {
    profiles.value = [];
    return;
  }
  loading.value = true;
  try {
    profiles.value = await fetchWrapper.get(`${apiUrl}/clients/${selectedClientId.value}/profiles`);
  } catch (error) {
    profiles.value = [];
  } finally {
    loading.value = false;
  }
}

watch(selectedClientId, loadProfiles);

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
      <UiParentCard title="Profiles">
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
          Please select a client to view pipeline profiles.
        </v-alert>

        <v-data-table
          v-else
          :headers="headers"
          :items="profiles"
          :loading="loading"
          item-value="id"
          class="border rounded-md"
          density="comfortable"
        >
          <template v-slot:item.is_default="{ item }">
            <v-chip
              :color="item.is_default ? 'success' : 'grey'"
              size="small"
            >
              {{ item.is_default ? 'Yes' : 'No' }}
            </v-chip>
          </template>
          <template v-slot:item.steps_count="{ item }">
            <v-chip color="secondary" size="small">{{ item.steps_count || 0 }}</v-chip>
          </template>
          <template v-slot:item.created_at="{ item }">
            <span class="text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex justify-center ga-2">
              <v-btn color="primary" variant="tonal" size="small" disabled>
                <EyeIcon size="16" stroke-width="1.5" class="mr-1" />
                View Steps
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
