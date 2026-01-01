<script setup lang="ts">
import { ref, shallowRef } from 'vue';

import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import LiveActivityFeed from '@/components/dashboards/dental/LiveActivityFeed.vue';

const page = ref({ title: 'Live Activity' });
const breadcrumbs = shallowRef([
  {
    title: 'Operations',
    disabled: false,
    href: '#'
  },
  {
    title: 'Live Activity',
    disabled: true,
    href: '#'
  }
]);
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Live Activity Feed">
        <LiveActivityFeed />
      </UiParentCard>
    </v-col>
  </v-row>
</template>
