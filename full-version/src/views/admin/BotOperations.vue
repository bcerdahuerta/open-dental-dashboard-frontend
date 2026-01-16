<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
  <UiParentCard title="Module Under Construction">
    <div class="d-flex flex-column align-center justify-center pa-10">
      <v-icon size="64" color="grey-lighten-1" icon="tabler-barrier-block"></v-icon>
      <h3 class="text-h3 mt-4 text-grey-darken-1">Coming Soon</h3>
      <p class="text-body-1 text-grey">This module is part of the Phase 3 roadmap.</p>
    </div>
  </UiParentCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';

const page = ref({ title: 'Bot Operations' });
const breadcrumbs = ref([
  { text: 'Dashboard', disabled: false, href: '#' },
  { text: 'Bot Operations', disabled: true, href: '#' }
]);
</script>
