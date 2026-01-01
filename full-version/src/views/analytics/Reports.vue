<script setup lang="ts">
import { ref, shallowRef } from 'vue';

import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';

const page = ref({ title: 'Reports' });
const breadcrumbs = shallowRef([
  {
    title: 'Analytics',
    disabled: false,
    href: '#'
  },
  {
    title: 'Reports',
    disabled: true,
    href: '#'
  }
]);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Reports">
        Coming Soon
      </UiParentCard>
    </v-col>
  </v-row>
</template>
