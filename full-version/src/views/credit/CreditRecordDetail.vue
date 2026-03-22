<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useCreditStore } from '@/stores/credit';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  CalendarIcon,
  UserIcon,
  CreditCardIcon,
  InfoCircleIcon,
} from 'vue-tabler-icons';

const route = useRoute();
const router = useRouter();
const creditStore = useCreditStore();
const { selectedRecord, loading, error } = storeToRefs(creditStore);
const { fetchRecord } = creditStore;

const recordId = computed(() => route.params.id as string);

function severityColor(severity: string): string {
  if (severity === 'High') return 'error';
  if (severity === 'Medium') return 'warning';
  return 'success';
}

function dispositionLabel(d: string): string {
  const map: Record<string, string> = {
    RefundImmediately: 'Refund Immediately',
    ApplyAtNextVisit: 'Apply at Next Visit',
    ContactPatient: 'Contact Patient',
    RecoupFromInsurance: 'Recoup from Insurance',
    ManualReview: 'Manual Review',
  };
  return map[d] ?? d;
}

function goBack() {
  router.back();
}

onMounted(async () => {
  await fetchRecord(recordId.value);
});
</script>

<template>
  <!-- Back button -->
  <v-row class="mb-2">
    <v-col cols="auto">
      <v-btn variant="text" color="primary" @click="goBack">
        <ArrowLeftIcon size="18" class="mr-1" stroke-width="1.5" />
        Back to Records
      </v-btn>
    </v-col>
  </v-row>

  <!-- Loading -->
  <v-row v-if="loading">
    <v-col cols="12" class="d-flex justify-center pa-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </v-col>
  </v-row>

  <template v-if="selectedRecord && !loading">
    <!-- Patient Info + Credit Amount -->
    <v-row>
      <v-col cols="12" md="8">
        <UiParentCard title="Patient Information">
          <v-row>
            <v-col cols="12" sm="6">
              <div class="d-flex align-center mb-3">
                <v-avatar size="36" class="bg-lightprimary mr-3" rounded>
                  <UserIcon size="20" class="text-primary" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <span class="text-body-2 text-medium-emphasis d-block">Patient Name</span>
                  <span class="font-weight-medium">{{ selectedRecord.patient_name ?? '—' }}</span>
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="d-flex align-center mb-3">
                <v-avatar size="36" class="bg-lightsecondary mr-3" rounded>
                  <CreditCardIcon size="20" class="text-secondary" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <span class="text-body-2 text-medium-emphasis d-block">Credit Type</span>
                  <v-chip size="small" variant="tonal" color="secondary">
                    {{ selectedRecord.credit_type }}
                  </v-chip>
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="d-flex align-center mb-3">
                <v-avatar size="36" class="bg-lightsuccess mr-3" rounded>
                  <CalendarIcon size="20" class="text-success" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <span class="text-body-2 text-medium-emphasis d-block">Age</span>
                  <span class="font-weight-medium">
                    {{ selectedRecord.age_days ?? 0 }} days ({{ selectedRecord.age_bucket ?? '—' }})
                  </span>
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="d-flex align-center mb-3">
                <v-avatar size="36" class="bg-lightwarning mr-3" rounded>
                  <CalendarIcon size="20" class="text-warning" stroke-width="1.5" />
                </v-avatar>
                <div>
                  <span class="text-body-2 text-medium-emphasis d-block">Next Appointment</span>
                  <span class="font-weight-medium">
                    {{ selectedRecord.has_future_appt ? selectedRecord.next_appt_date : 'None scheduled' }}
                  </span>
                </div>
              </div>
            </v-col>
          </v-row>

          <!-- Flags row -->
          <v-divider class="my-3" />
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              v-if="selectedRecord.payer_type_flags"
              size="small"
              variant="tonal"
              color="info"
            >
              {{ selectedRecord.payer_type_flags }}
            </v-chip>
            <v-chip
              v-if="selectedRecord.status_flags"
              v-for="flag in selectedRecord.status_flags.split(',')"
              :key="flag"
              size="small"
              variant="tonal"
              color="secondary"
            >
              {{ flag.trim() }}
            </v-chip>
            <v-chip
              v-if="selectedRecord.is_excluded"
              size="small"
              variant="flat"
              color="warning"
            >
              Excluded: {{ selectedRecord.exclusion_reason }}
            </v-chip>
          </div>
        </UiParentCard>
      </v-col>

      <!-- Credit Amount + Severity + Disposition card -->
      <v-col cols="12" md="4">
        <UiParentCard title="Classification">
          <div class="text-center pa-4">
            <h2 class="text-h3 font-weight-bold text-primary mb-2">
              ${{ Math.abs(selectedRecord.credit_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
            </h2>
            <v-chip
              :color="severityColor(selectedRecord.severity_score)"
              variant="flat"
              size="large"
              class="mb-3"
            >
              {{ selectedRecord.severity_score }} Severity
            </v-chip>
            <v-divider class="my-3" />
            <span class="text-body-2 text-medium-emphasis d-block mb-1">Recommended Action</span>
            <span class="text-h6 font-weight-medium">
              {{ dispositionLabel(selectedRecord.recommended_disposition) }}
            </span>
          </div>

          <!-- Family summary -->
          <v-divider class="my-3" />
          <v-row dense>
            <v-col cols="6" class="text-center">
              <span class="text-body-2 text-medium-emphasis d-block">Family Total</span>
              <span class="font-weight-medium">
                ${{ (selectedRecord.family_credit_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
              </span>
            </v-col>
            <v-col cols="6" class="text-center">
              <span class="text-body-2 text-medium-emphasis d-block">Guarantor Rollup</span>
              <span class="font-weight-medium">
                ${{ (selectedRecord.guarantor_rollup_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
              </span>
            </v-col>
          </v-row>
        </UiParentCard>
      </v-col>
    </v-row>

    <!-- Why Credit -->
    <v-row>
      <v-col cols="12">
        <UiParentCard title="Credit Source Analysis">
          <div class="d-flex align-start">
            <v-avatar size="36" class="bg-lightprimary mr-3 mt-1" rounded>
              <InfoCircleIcon size="20" class="text-primary" stroke-width="1.5" />
            </v-avatar>
            <div>
              <pre class="text-body-1" style="white-space: pre-wrap; font-family: inherit;">{{ selectedRecord.why_credit ?? 'No source analysis available.' }}</pre>
            </div>
          </div>
        </UiParentCard>
      </v-col>
    </v-row>

    <!-- Exceptions -->
    <v-row v-if="selectedRecord.exceptions && selectedRecord.exceptions.length > 0">
      <v-col cols="12">
        <UiParentCard title="Exception Flags">
          <v-list lines="three">
            <v-list-item
              v-for="exc in selectedRecord.exceptions"
              :key="exc.id"
              class="rounded-lg mb-2"
            >
              <template #prepend>
                <v-avatar size="36" :class="`bg-light${severityColor(exc.severity)}`" rounded>
                  <AlertTriangleIcon size="20" :class="`text-${severityColor(exc.severity)}`" stroke-width="1.5" />
                </v-avatar>
              </template>
              <template #title>
                <div class="d-flex align-center ga-2">
                  <span class="font-weight-medium">{{ exc.flag_type }}</span>
                  <v-chip
                    size="x-small"
                    :color="severityColor(exc.severity)"
                    variant="flat"
                  >
                    {{ exc.severity }}
                  </v-chip>
                </div>
              </template>
              <template #subtitle>
                {{ exc.why_flagged }}
              </template>
            </v-list-item>
          </v-list>
        </UiParentCard>
      </v-col>
    </v-row>
  </template>

  <!-- Error -->
  <v-row v-if="error">
    <v-col cols="12">
      <v-alert type="error" variant="tonal" closable>
        {{ error }}
      </v-alert>
    </v-col>
  </v-row>
</template>
