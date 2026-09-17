<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import SopChecklist from '@/components/onboarding/SopChecklist.vue';
import { onboardingApi } from '@/api/onboarding';
import { WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';
import type { OnboardingSopProjection } from '@/types/onboarding';

const route = useRoute();
const sop = ref<OnboardingSopProjection | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const page = { title: 'Onboarding double-check' };
const breadcrumbs = [
  { title: 'Dashboard', disabled: false, href: '/dashboard/default' },
  { title: 'Onboarding Composer', disabled: false, href: '/admin/onboarding' },
  { title: 'Double-check', disabled: true, href: '#' }
];

onMounted(async () => {
  loading.value = true;
  try {
    const response = await onboardingApi.getSopVersion(String(route.params.clientId ?? ''), String(route.params.versionId ?? ''));
    sop.value = response.data.sop;
    if (!response.data.sop) error.value = 'That onboarding draft version is not available for this client.';
  } catch (errorValue) {
    error.value =
      errorValue instanceof WorkflowBuilderHttpError && errorValue.status === 403
        ? 'You are not authorized to read this onboarding draft.'
        : 'That onboarding draft version is not available for this client.';
  } finally {
    loading.value = false;
  }
});

function printScreen(): void {
  window.print();
}
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Onboarding Double-Check">
        <div class="d-flex flex-wrap ga-2 mb-4">
          <v-btn data-test="sop-print" color="primary" variant="tonal" @click="printScreen">Print this screen</v-btn>
        </div>
        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
        <v-alert v-if="error" data-test="sop-error" type="warning" variant="tonal">{{ error }}</v-alert>
        <SopChecklist v-else-if="sop" :sop="sop" />
      </UiParentCard>
    </v-col>
  </v-row>
</template>
