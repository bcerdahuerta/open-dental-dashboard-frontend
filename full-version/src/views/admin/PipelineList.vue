<script setup lang="ts">
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { ClockIcon } from 'vue-tabler-icons';
</script>

<template>
  <v-row justify="center">
    <v-col cols="12" md="8">
      <UiParentCard title="Pipeline Management">
        <div class="text-center py-10">
          <v-avatar color="lightprimary" size="80" class="mb-4">
            <ClockIcon size="40" stroke-width="1.5" class="text-primary" />
          </v-avatar>
          <h3 class="text-h4 mb-2">Coming Soon</h3>
          <p class="text-medium-emphasis">
            Pipeline configuration and management will be available in an upcoming release.
          </p>
        </div>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
