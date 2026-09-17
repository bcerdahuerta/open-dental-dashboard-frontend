<script setup lang="ts">
import { computed } from 'vue';
import { clientLabel } from '@/components/onboarding/clientLabels';
import type { OnboardingSopProjection } from '@/types/onboarding';

const props = defineProps<{ sop: OnboardingSopProjection }>();

const choices = computed(() => props.sop.submitted_choices);
const lockedKeys = computed(() => new Set(props.sop.materialization.locked_atom_keys));
const capabilities = computed(() =>
  props.sop.materialization.selected_atom_keys.map((key) => ({
    key,
    label: clientLabel(key),
    state: lockedKeys.value.has(key) ? 'Required and locked' : 'Optional'
  }))
);
const trace = computed(() =>
  props.sop.materialization.expansion_trace.map((entry) => ({
    source: clientLabel(entry.source_key),
    added: entry.added_atom_keys.map(clientLabel).join(', ')
  }))
);
const notes = (values: string[] | null | undefined) => (values?.length ? values.map(clientLabel).join(', ') : 'None');
const submittedAt = computed(() => props.sop.receipt.receipt_created_at ?? props.sop.receipt.created_at ?? 'not recorded');
</script>

<template>
  <div data-test="sop-checklist">
    <v-alert type="info" variant="tonal" class="mb-4">
      Everything the client submitted is listed here so the operator can double-check it before any activation. Print this screen when a
      paper copy is needed.
    </v-alert>
    <div class="text-subtitle-2 mb-2">Client</div>
    <div class="text-body-1 mb-4">{{ sop.client_id }}</div>
    <div class="text-subtitle-2 mb-2">Draft version</div>
    <v-list density="compact" class="border rounded mb-4" data-test="sop-version">
      <v-list-item>
        <v-list-item-title>{{ sop.version.version_id }}</v-list-item-title>
        <v-list-item-subtitle>Step {{ sop.version.version_number }} · {{ clientLabel(sop.version.state) }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <div class="text-subtitle-2 mb-2">What the client submitted</div>
    <v-list density="compact" class="border rounded mb-4" data-test="sop-choices">
      <v-list-item>
        <v-list-item-title>{{ clientLabel(choices.archetype_key) }}</v-list-item-title>
        <v-list-item-subtitle>Verification archetype</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>{{ clientLabel(choices.fbd_scope) }}</v-list-item-title>
        <v-list-item-subtitle>FBD scope</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>{{ choices.elg_window_days ?? 'Not submitted' }} days</v-list-item-title>
        <v-list-item-subtitle>ELG window</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>{{ clientLabel(choices.cross_year_mode) }}</v-list-item-title>
        <v-list-item-subtitle>Cross-year mode</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title data-test="sop-optional-notes">{{ notes(choices.optional_notes) }}</v-list-item-title>
        <v-list-item-subtitle>Optional notes requested</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>{{ notes(choices.removed_notes) }}</v-list-item-title>
        <v-list-item-subtitle>Optional notes not requested</v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <div class="text-subtitle-2 mb-2">Capabilities that will run</div>
    <v-list density="compact" class="border rounded mb-4" data-test="sop-capabilities">
      <v-list-item v-for="capability in capabilities" :key="capability.key">
        <v-list-item-title>{{ capability.label }}</v-list-item-title>
        <v-list-item-subtitle>{{ capability.state }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
    <div class="text-subtitle-2 mb-2">How the capabilities were assembled</div>
    <v-list density="compact" class="border rounded mb-4" data-test="sop-trace">
      <v-list-item v-for="entry in trace" :key="entry.source">
        <v-list-item-title>{{ entry.source }}</v-list-item-title>
        <v-list-item-subtitle>Adds {{ entry.added }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="!trace.length">
        <v-list-item-title>No additional capabilities were needed</v-list-item-title>
      </v-list-item>
    </v-list>
    <div class="text-subtitle-2 mb-2">Submission receipt</div>
    <v-list density="compact" class="border rounded" data-test="sop-receipt">
      <v-list-item>
        <v-list-item-title>{{ sop.receipt.version_id }}</v-list-item-title>
        <v-list-item-subtitle>{{ clientLabel(sop.receipt.state) }} · submitted {{ submittedAt }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item>
        <v-list-item-title>{{ sop.receipt.actor_user_id ?? 'Not recorded' }}</v-list-item-title>
        <v-list-item-subtitle>Recorded operator</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </div>
</template>
