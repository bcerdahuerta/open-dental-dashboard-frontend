<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useClinicStore, type ProductEnrollment } from '@/stores/clinics';
import { ToggleLeftIcon, ArrowBackIcon } from 'vue-tabler-icons';

const props = defineProps<{
  clinicId: string;
}>();

const clinicStore = useClinicStore();
const loading = ref(true);
const saving = ref<string | null>(null);

// Known products — add new products here in the future
const products = [
  {
    type: 'writeback',
    name: 'Insurance Writeback',
    description:
      'Automated insurance verification data writeback to Open Dental. Includes spreadsheet-driven workflows and pipeline steps.',
    icon: ArrowBackIcon,
    color: 'success'
  }
];

function isEnrolled(productType: string): boolean {
  return clinicStore.enrollments.some((e: ProductEnrollment) => e.product_type === productType && e.enabled);
}

async function toggleProduct(productType: string) {
  saving.value = productType;
  try {
    if (isEnrolled(productType)) {
      await clinicStore.toggleProduct(props.clinicId, productType, false);
    } else {
      await clinicStore.enrollProduct(props.clinicId, productType);
    }
  } finally {
    saving.value = null;
  }
}

onMounted(async () => {
  await clinicStore.fetchEnrollments(props.clinicId);
  loading.value = false;
});
</script>

<template>
  <div class="pa-2">
    <v-row v-if="loading" justify="center" class="pa-10">
      <v-progress-circular indeterminate color="primary" />
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <v-alert type="info" variant="tonal" density="compact" class="mb-5">
          <strong>Product Enrollment</strong> — Enable or disable which products this clinic participates in. Each product runs
          independently and only processes enrolled clinics.
        </v-alert>
      </v-col>

      <v-col v-for="product in products" :key="product.type" cols="12" md="6">
        <v-card variant="outlined" class="pa-5">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="d-flex align-center ga-3">
              <v-avatar :color="product.color" size="40" variant="tonal">
                <component :is="product.icon" :size="22" stroke-width="1.5" />
              </v-avatar>
              <div>
                <h6 class="text-subtitle-1 font-weight-bold">{{ product.name }}</h6>
                <v-chip :color="isEnrolled(product.type) ? 'success' : 'default'" size="x-small" class="mt-1">
                  {{ isEnrolled(product.type) ? 'Enrolled' : 'Not Enrolled' }}
                </v-chip>
              </div>
            </div>

            <v-switch
              :model-value="isEnrolled(product.type)"
              :loading="saving === product.type"
              :disabled="saving !== null"
              color="primary"
              hide-details
              @update:model-value="toggleProduct(product.type)"
            />
          </div>

          <p class="text-body-2 text-medium-emphasis">
            {{ product.description }}
          </p>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
