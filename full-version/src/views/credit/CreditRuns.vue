<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useCreditStore } from '@/stores/credit';
import { useAuthStore } from '@/stores/auth';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import {
  PlayerPlayIcon,
  RefreshIcon,
} from 'vue-tabler-icons';

const creditStore = useCreditStore();
const authStore = useAuthStore();
const { runs, runsPagination, creditClinics, loading, error } = storeToRefs(creditStore);
const { fetchRuns, triggerRun, fetchCreditClinics } = creditStore;

const showTriggerDialog = ref(false);
const triggerLoading = ref(false);
const selectedClinicIds = ref<string[]>([]);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

const isAdmin = computed(() => authStore.user?.role === 'admin');

const headers = [
  { title: 'Clinic', key: 'clinic_id', sortable: false },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Patients', key: 'total_patients', align: 'end' as const },
  { title: 'Credits', key: 'total_credits', align: 'end' as const },
  { title: 'Total Amount', key: 'total_credit_amount', align: 'end' as const },
  { title: 'Started', key: 'started_at', sortable: false },
  { title: 'Completed', key: 'completed_at', sortable: false },
  { title: 'Error', key: 'error_message', sortable: false },
];

function clinicName(clinicId: string): string {
  const clinic = creditClinics.value.find((c) => c.id === clinicId);
  return clinic ? clinic.clinic_name : clinicId.slice(0, 8) + '…';
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'success',
    RUNNING: 'info',
    PENDING: 'warning',
    FAILED: 'error',
    VERSION_INCOMPATIBLE: 'error',
  };
  return map[status] ?? 'secondary';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function openTriggerDialog() {
  await fetchCreditClinics();
  selectedClinicIds.value = [];
  showTriggerDialog.value = true;
}

async function onTrigger() {
  triggerLoading.value = true;
  try {
    const ids = selectedClinicIds.value.length > 0 ? selectedClinicIds.value : undefined;
    const result = await triggerRun(ids);
    if (result?.dispatched === 0) {
      snackbarText.value = result.message || 'No clinics enrolled in credit. Go to Clinic Detail → Products tab to enable.';
      snackbarColor.value = 'warning';
    } else {
      snackbarText.value = `Credit run triggered for ${result?.dispatched || 0} clinic(s)!`;
      snackbarColor.value = 'success';
      await fetchRuns();
    }
  } catch (err: any) {
    snackbarText.value = `Trigger failed: ${err}`;
    snackbarColor.value = 'error';
  } finally {
    triggerLoading.value = false;
    showTriggerDialog.value = false;
    snackbar.value = true;
  }
}

const page = ref(1);
function onTableUpdate(opts: { page: number; itemsPerPage: number }) {
  page.value = opts.page;
  fetchRuns({ page: opts.page, per_page: opts.itemsPerPage });
}

onMounted(async () => {
  await Promise.all([fetchRuns(), fetchCreditClinics()]);
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Credit Run History">
        <!-- Toolbar -->
        <div class="d-flex align-center mb-4">
          <v-btn
            color="secondary"
            variant="tonal"
            size="small"
            @click="fetchRuns()"
          >
            <RefreshIcon size="18" class="mr-1" stroke-width="1.5" />
            Refresh
          </v-btn>
          <v-spacer />
          <v-btn
            v-if="isAdmin"
            color="primary"
            variant="flat"
            @click="openTriggerDialog"
          >
            <PlayerPlayIcon size="18" class="mr-1" stroke-width="1.5" />
            Trigger Run
          </v-btn>
        </div>

        <!-- Data table -->
        <v-data-table-server
          :headers="headers"
          :items="runs"
          :items-length="runsPagination.total"
          :loading="loading"
          :items-per-page="20"
          :page="page"
          item-value="id"
          hover
          @update:options="onTableUpdate"
        >
          <template #item.clinic_id="{ item }">
            <span class="font-weight-medium">{{ clinicName(item.clinic_id) }}</span>
          </template>

          <template #item.status="{ item }">
            <v-chip
              size="small"
              :color="statusColor(item.status)"
              variant="flat"
            >
              {{ item.status }}
            </v-chip>
          </template>

          <template #item.total_credit_amount="{ item }">
            <span class="font-weight-bold text-primary">
              ${{ item.total_credit_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00' }}
            </span>
          </template>

          <template #item.started_at="{ item }">
            {{ formatDate(item.started_at) }}
          </template>

          <template #item.completed_at="{ item }">
            {{ formatDate(item.completed_at) }}
          </template>

          <template #item.error_message="{ item }">
            <span v-if="item.error_message" class="text-error text-body-2">
              {{ item.error_message.slice(0, 60) }}{{ item.error_message.length > 60 ? '…' : '' }}
            </span>
            <span v-else class="text-medium-emphasis">—</span>
          </template>

          <template #no-data>
            <div class="text-center pa-8 text-medium-emphasis">
              No credit runs found. Click "Trigger Run" to start.
            </div>
          </template>
        </v-data-table-server>
      </UiParentCard>
    </v-col>
  </v-row>

  <!-- Trigger confirm dialog -->
  <v-dialog v-model="showTriggerDialog" max-width="500">
    <v-card>
      <v-card-title class="text-h6">Trigger Credit Run</v-card-title>
      <v-card-text>
        <p class="text-body-1 mb-4">
          Select which clinics to run credit analysis for, or leave empty to run
          for <strong>all enrolled</strong> clinics.
        </p>

        <v-select
          v-model="selectedClinicIds"
          :items="creditClinics"
          item-title="clinic_name"
          item-value="id"
          label="Clinics (optional — empty = all)"
          variant="outlined"
          color="primary"
          multiple
          chips
          closable-chips
          hide-details
        >
          <template #no-data>
            <div class="text-center pa-4 text-medium-emphasis">
              No clinics enrolled in credit.<br />
              Go to Clinic Detail → Products tab to enable.
            </div>
          </template>
        </v-select>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showTriggerDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="triggerLoading"
          :disabled="creditClinics.length === 0"
          @click="onTrigger"
        >
          {{ selectedClinicIds.length > 0 ? `Run ${selectedClinicIds.length} clinic(s)` : 'Run All' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Snackbar -->
  <v-snackbar
    v-model="snackbar"
    :color="snackbarColor"
    :timeout="4000"
    location="bottom right"
  >
    {{ snackbarText }}
  </v-snackbar>

  <!-- Error alert -->
  <v-row v-if="error">
    <v-col cols="12">
      <v-alert type="error" variant="tonal" closable>
        {{ error }}
      </v-alert>
    </v-col>
  </v-row>
</template>
