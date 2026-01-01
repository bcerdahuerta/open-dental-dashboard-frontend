<script setup lang="ts">
import { ref, shallowRef } from 'vue';

import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';

const page = ref({ title: 'Patient Search' });
const breadcrumbs = shallowRef([
  {
    title: 'Operations',
    disabled: false,
    href: '#'
  },
  {
    title: 'Patient Search',
    disabled: true,
    href: '#'
  }
]);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Patient Search">
        Coming Soon
      </UiParentCard>
    </v-col>
  </v-row>
</template>
