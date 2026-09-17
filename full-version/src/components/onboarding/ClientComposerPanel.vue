<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CLIENT_ARCHETYPES,
  CLIENT_CROSS_YEAR_MODES,
  CLIENT_FBD_SCOPES,
  CLIENT_OPTIONAL_NOTES,
  clientLabel
} from '@/components/onboarding/clientLabels';
import type { OnboardingDraftRequest } from '@/types/onboarding';

const props = defineProps<{ loading: boolean }>();
const emit = defineEmits<{ draft: [request: OnboardingDraftRequest]; mintInvite: [] }>();

const archetypeKey = ref(CLIENT_ARCHETYPES[0]);
const fbdScope = ref(CLIENT_FBD_SCOPES[0]);
const crossYearMode = ref(CLIENT_CROSS_YEAR_MODES[0]);
const elgWindowDays = ref('30');
const includedNotes = ref<string[]>([]);
const excludedNotes = ref<string[]>([]);
const overlappingNotes = computed(() => includedNotes.value.filter((note) => excludedNotes.value.includes(note)));
const items = (keys: string[]) => keys.map((key) => ({ title: clientLabel(key), value: key }));

function toggleIncluded(note: string): void {
  includedNotes.value = includedNotes.value.includes(note)
    ? includedNotes.value.filter((key) => key !== note)
    : [...includedNotes.value, note];
}

function toggleExcluded(note: string): void {
  excludedNotes.value = excludedNotes.value.includes(note)
    ? excludedNotes.value.filter((key) => key !== note)
    : [...excludedNotes.value, note];
}

function request(): OnboardingDraftRequest {
  const days = Number.parseInt(elgWindowDays.value, 10);
  return {
    archetype_key: archetypeKey.value,
    optional_notes: [...includedNotes.value],
    removed_notes: [...excludedNotes.value],
    fbd_scope: fbdScope.value,
    elg_window_days: Number.isFinite(days) && days >= 0 ? days : 0,
    cross_year_mode: crossYearMode.value
  };
}

function submitDraft(): void {
  if (overlappingNotes.value.length) return;
  emit('draft', request());
}
</script>

<template>
  <v-select
    v-model="archetypeKey"
    data-test="composer-archetype"
    :items="items(CLIENT_ARCHETYPES)"
    item-title="title"
    item-value="value"
    label="Verification archetype"
    variant="outlined"
    color="primary"
    hide-details="auto"
    class="mb-4"
  />
  <div class="text-subtitle-2 mb-2">Optional notes</div>
  <div v-for="note in CLIENT_OPTIONAL_NOTES" :key="note" class="d-flex flex-wrap align-center ga-2 mb-2">
    <span class="text-body-2" style="min-width: 170px">{{ clientLabel(note) }}</span>
    <v-btn
      :data-test="`composer-note-include-${note}`"
      size="small"
      color="primary"
      :variant="includedNotes.includes(note) ? 'flat' : 'tonal'"
      @click="toggleIncluded(note)"
      >Include</v-btn
    >
    <v-btn
      :data-test="`composer-note-exclude-${note}`"
      size="small"
      color="secondary"
      :variant="excludedNotes.includes(note) ? 'flat' : 'tonal'"
      @click="toggleExcluded(note)"
      >Exclude</v-btn
    >
  </div>
  <v-alert v-if="overlappingNotes.length" data-test="composer-note-overlap-message" type="warning" variant="tonal" class="mb-3">
    Each optional note can be included or excluded, not both. Clear {{ overlappingNotes.map(clientLabel).join(', ') }} from one side before
    requesting the draft. Your selections are preserved.
  </v-alert>
  <v-select
    v-model="fbdScope"
    data-test="composer-fbd-scope"
    :items="items(CLIENT_FBD_SCOPES)"
    item-title="title"
    item-value="value"
    label="FBD scope"
    variant="outlined"
    color="primary"
    hide-details="auto"
    class="mb-3"
  />
  <v-text-field
    v-model="elgWindowDays"
    data-test="composer-elg-window"
    label="ELG window (days)"
    type="number"
    variant="outlined"
    color="primary"
    hide-details="auto"
    class="mb-3"
  />
  <v-select
    v-model="crossYearMode"
    data-test="composer-cross-year"
    :items="items(CLIENT_CROSS_YEAR_MODES)"
    item-title="title"
    item-value="value"
    label="Cross-year mode"
    variant="outlined"
    color="primary"
    hide-details="auto"
    class="mb-3"
  />
  <div class="d-flex flex-wrap ga-2">
    <v-btn
      data-test="composer-mint-draft"
      color="primary"
      variant="flat"
      :loading="props.loading"
      :disabled="overlappingNotes.length > 0"
      @click="submitDraft"
      >Request the onboarding draft</v-btn
    >
    <v-btn data-test="composer-mint-invite" color="secondary" variant="tonal" :disabled="props.loading" @click="emit('mintInvite')"
      >Create the client invite link</v-btn
    >
  </div>
</template>
