<script setup lang="ts">
import { ref } from 'vue';
import type { WorkflowBlueprintRoot } from '@/types/workflowBuilder';

const props = defineProps<{
  root: WorkflowBlueprintRoot | null;
  history: WorkflowBlueprintRoot | null;
  authenticatedSubjectId: string | null;
}>();
const emit = defineEmits<{
  review: [versionId: string];
  approve: [versionId: string];
  discard: [value: { versionId: string; reasonCategory: string }];
}>();
const discardReason = ref('CORRECTION');

function discard(versionId: string): void {
  if (discardReason.value) emit('discard', { versionId, reasonCategory: discardReason.value });
}
</script>

<template>
  <v-alert v-if="!root" type="info" variant="tonal">No server root is available for this client.</v-alert>
  <template v-else>
    <v-alert type="info" variant="tonal" class="mb-4">
      History is server-returned from the bounded latest-100 versions projection. Authenticated subject:
      {{ authenticatedSubjectId ?? 'unavailable' }}. Server verifies exact personal approval eligibility.
    </v-alert>
    <v-text-field
      v-model="discardReason"
      data-test="discard-reason"
      label="Discard reason category"
      variant="outlined"
      color="primary"
      hide-details="auto"
      class="mb-3"
    />
    <v-list density="compact" class="border rounded">
      <v-list-item v-for="version in history?.versions ?? []" :key="version.version_id">
        <v-list-item-title>{{ version.version_id }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ version.state }} · {{ version.content_digest }} · {{ version.disposition ?? 'active' }}
          <span v-if="version.replacement_version_id"> · replacement {{ version.replacement_version_id }}</span>
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            v-if="version.state === 'DRAFT' && !version.disposition"
            data-test="review-version"
            color="primary"
            variant="outlined"
            size="small"
            @click="emit('review', version.version_id)"
            >Submit review</v-btn
          >
          <v-btn
            v-if="version.state === 'IN_REVIEW' && !version.disposition"
            data-test="approve-version"
            color="primary"
            variant="flat"
            size="small"
            @click="emit('approve', version.version_id)"
            >Request personal approval</v-btn
          >
          <v-btn
            v-if="version.state !== 'APPROVED' && !version.disposition"
            data-test="discard-version"
            color="secondary"
            variant="tonal"
            size="small"
            @click="discard(version.version_id)"
            >Discard proposal</v-btn
          >
        </template>
      </v-list-item>
    </v-list>
  </template>
</template>
