<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { WorkflowAuthoringRequest, WorkflowBuilderCatalog } from '@/types/workflowBuilder';

const props = withDefaults(defineProps<{ catalog: WorkflowBuilderCatalog | null; loading: boolean; rootExists?: boolean }>(), {
  rootExists: false
});
const emit = defineEmits<{ preview: [request: WorkflowAuthoringRequest]; bootstrap: [archetypeKey: string] }>();

const selectedArchetype = ref('');
const selectedPacks = ref<string[]>([]);
const selectedAtoms = ref<string[]>([]);
const facts = computed(() => props.catalog?.archetype_facts[selectedArchetype.value]);
const serverSelectedOptionalAtoms = (archetypeKey: string): string[] => {
  const serverFacts = props.catalog?.archetype_facts[archetypeKey];
  if (!serverFacts) return [];
  return (serverFacts.selected_atom_keys ?? []).filter((atomKey) => serverFacts.capability_states[atomKey] === 'OPTIONAL');
};
watch(
  () => props.catalog,
  (next) => {
    selectedArchetype.value = next?.archetypes[0] ?? '';
    selectedPacks.value = [];
    selectedAtoms.value = serverSelectedOptionalAtoms(selectedArchetype.value);
  },
  { immediate: true }
);
watch(selectedArchetype, (next) => {
  selectedAtoms.value = serverSelectedOptionalAtoms(next);
});

function removedAtomKeys(): string[] {
  const selected = new Set(selectedAtoms.value);
  return serverSelectedOptionalAtoms(selectedArchetype.value).filter((atomKey) => !selected.has(atomKey));
}

function preview(): void {
  if (!props.catalog || !selectedArchetype.value) return;
  emit('preview', {
    schema_version: 'assisted-authoring-v1',
    catalog_version: props.catalog.catalog_version,
    archetype_key: selectedArchetype.value,
    selected_pack_keys: selectedPacks.value,
    selected_atom_keys: selectedAtoms.value,
    removed_atom_keys: removedAtomKeys()
  });
}
</script>

<template>
  <v-alert v-if="!catalog" type="info" variant="tonal">Select an authorized client to load its closed catalog.</v-alert>
  <template v-else>
    <v-select
      v-model="selectedArchetype"
      :items="catalog?.archetypes ?? []"
      label="Server catalog archetype"
      variant="outlined"
      color="primary"
      hide-details="auto"
      class="mb-4"
    />
    <v-select
      v-model="selectedPacks"
      :items="Object.keys(catalog?.packs ?? {})"
      label="Guided packs"
      multiple
      chips
      variant="outlined"
      color="primary"
      hide-details="auto"
      class="mb-4"
    />
    <div class="text-subtitle-2 mb-2">Server-defined atomic capabilities</div>
    <v-list density="compact" class="border rounded mb-4">
      <v-list-item v-for="atom in catalog?.atoms ?? []" :key="atom">
        <template #prepend>
          <v-checkbox
            v-if="facts?.capability_states[atom] === 'OPTIONAL'"
            v-model="selectedAtoms"
            :value="atom"
            :data-test="`atom-${atom}`"
            color="primary"
            hide-details
          />
          <v-checkbox
            v-else
            :model-value="facts?.selected_atom_keys.includes(atom)"
            :data-test="`atom-${atom}`"
            :disabled="true"
            color="primary"
            hide-details
          />
        </template>
        <v-list-item-title>{{ atom }}</v-list-item-title>
        <v-list-item-subtitle>
          <template v-if="facts?.capability_states[atom] === 'REQUIRED'">Required and locked</template>
          <template v-else>{{ facts?.capability_states[atom] }}</template>
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <div class="d-flex flex-wrap ga-2">
      <v-btn color="primary" variant="flat" :loading="loading" :disabled="!selectedArchetype" @click="preview">Preview server draft</v-btn>
      <v-btn
        v-if="!rootExists"
        data-test="bootstrap-root"
        color="secondary"
        variant="tonal"
        :disabled="!selectedArchetype"
        @click="emit('bootstrap', selectedArchetype)"
        >Initialize absent root</v-btn
      >
    </div>
  </template>
</template>
