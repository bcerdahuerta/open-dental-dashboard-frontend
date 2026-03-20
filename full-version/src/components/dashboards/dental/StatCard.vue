<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  title: string;
  value: number;
  subtitle: string;
  color: 'warning' | 'primary' | 'success' | 'error';
  icon: Component;
}>();
</script>

<template>
  <v-card variant="flat" class="rounded-lg" :style="{ borderLeft: '4px solid rgb(var(--v-theme-' + color + '))' }">
    <v-card-text>
      <div class="d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h2 font-weight-bold" :class="`text-${color}`">
            {{ value }}
          </h2>
          <span class="text-subtitle-2 d-block mt-1" :class="`text-${color}`">
            {{ title }}
          </span>
          <span class="text-caption text-medium-emphasis d-block mt-1">
            {{ subtitle }}
          </span>
        </div>
        <v-avatar :color="color" size="48" rounded="lg" variant="tonal">
          <component :is="icon" stroke-width="1.5" size="24" />
        </v-avatar>
      </div>
    </v-card-text>
  </v-card>
</template>
