<script setup lang="ts">
import { computed } from 'vue';
import type { WorkflowBuilderMaterialization } from '@/types/workflowBuilder';

const props = defineProps<{
  materialization: WorkflowBuilderMaterialization | null;
  rootEtag: string | null;
  loading: boolean;
}>();
defineEmits<{ createDraft: [] }>();

// Display-only projection of already-returned server material: absent groups render nothing and issue no extra reads.
const candidateDetail = computed(() => {
  const candidate = props.materialization?.candidate;
  return {
    selectedAtomKeys: candidate?.selected_atom_keys ?? [],
    lockedAtomKeys: candidate?.locked_atom_keys ?? [],
    dependencies: candidate?.dependencies ?? [],
    expansionSummary: (candidate?.expansion_trace ?? []).map((entry) => ({
      sourceKey: entry.source_key,
      addedAtomKeys: entry.added_atom_keys ?? []
    }))
  };
});
const hasCandidateDetail = computed(
  () =>
    candidateDetail.value.selectedAtomKeys.length > 0 ||
    candidateDetail.value.lockedAtomKeys.length > 0 ||
    candidateDetail.value.dependencies.length > 0 ||
    candidateDetail.value.expansionSummary.length > 0
);
</script>

<template>
  <v-alert v-if="!materialization" type="info" variant="tonal">Preview a closed catalog selection to view server material.</v-alert>
  <template v-else>
    <v-alert v-if="materialization.diagnostics.length" type="warning" variant="tonal" class="mb-4">
      <div v-for="diagnostic in materialization.diagnostics" :key="`${diagnostic.subject_kind}-${diagnostic.code}`">
        {{ diagnostic.code }}
      </div>
    </v-alert>
    <v-alert v-if="!materialization.candidate" type="error" variant="tonal">Server material is unavailable for this selection.</v-alert>
    <template v-else>
      <v-chip color="info" class="bg-lightinfo mb-3" size="small">{{ materialization.candidate.lifecycle }}</v-chip>
      <v-textarea
        :model-value="materialization.canonical_bytes ?? ''"
        label="Server canonical material"
        readonly
        variant="outlined"
        color="primary"
        hide-details="auto"
        class="mb-3"
      />
      <v-text-field
        :model-value="materialization.digest ?? ''"
        label="Server digest"
        readonly
        variant="outlined"
        color="primary"
        hide-details="auto"
        class="mb-3"
      />
      <v-list v-if="hasCandidateDetail" data-test="candidate-detail" density="compact" class="border rounded mb-3">
        <v-list-item v-if="candidateDetail.selectedAtomKeys.length" data-test="candidate-selected-atoms">
          <v-list-item-title>Selected atoms</v-list-item-title>
          <v-list-item-subtitle>
            <v-chip
              v-for="atomKey in candidateDetail.selectedAtomKeys"
              :key="`selected-${atomKey}`"
              data-test="candidate-selected-atom"
              color="info"
              class="bg-lightinfo me-1"
              size="small"
              >{{ atomKey }}</v-chip
            >
          </v-list-item-subtitle>
        </v-list-item>
        <v-list-item v-if="candidateDetail.lockedAtomKeys.length" data-test="candidate-locked-atoms">
          <v-list-item-title>Locked atoms</v-list-item-title>
          <v-list-item-subtitle>
            <v-chip
              v-for="atomKey in candidateDetail.lockedAtomKeys"
              :key="`locked-${atomKey}`"
              data-test="candidate-locked-atom"
              color="secondary"
              class="bg-lightsecondary me-1"
              size="small"
              >{{ atomKey }}</v-chip
            >
          </v-list-item-subtitle>
        </v-list-item>
        <v-list-item v-if="candidateDetail.dependencies.length" data-test="candidate-dependencies">
          <v-list-item-title>Dependency statuses</v-list-item-title>
          <v-list-item-subtitle>
            <div
              v-for="dependency in candidateDetail.dependencies"
              :key="`${dependency.key}-${dependency.status}`"
              data-test="candidate-dependency"
            >
              {{ dependency.key }}: {{ dependency.status }}
            </div>
          </v-list-item-subtitle>
        </v-list-item>
        <v-list-item v-if="candidateDetail.expansionSummary.length" data-test="candidate-expansion-trace">
          <v-list-item-title>Expansion trace summary</v-list-item-title>
          <v-list-item-subtitle>
            <div v-for="entry in candidateDetail.expansionSummary" :key="entry.sourceKey" data-test="candidate-expansion-entry">
              {{ entry.sourceKey }} added {{ entry.addedAtomKeys.length }} atom(s)<template v-if="entry.addedAtomKeys.length"
                >: {{ entry.addedAtomKeys.join(', ') }}</template
              >
            </div>
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-btn
        color="primary"
        variant="flat"
        :loading="loading"
        :disabled="!rootEtag || !materialization.canonical_bytes || !materialization.digest"
        @click="$emit('createDraft')"
      >
        Create non-activating draft
      </v-btn>
    </template>
  </template>
</template>
