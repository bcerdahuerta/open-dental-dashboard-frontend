<script setup lang="ts">
import type { ExtractionNoteSettings, OnboardingNoteReadingChoice, OnboardingNoteReadingMode } from '@/types/onboarding';
const props = defineProps<{ noteReading: OnboardingNoteReadingChoice; modelValue: ExtractionNoteSettings }>();
const emit = defineEmits<{ 'update:enabled': [enabled: boolean]; 'update:mode': [mode: OnboardingNoteReadingMode] }>();
</script>

<template>
  <section data-test="note-reading-choice" class="mb-5">
    <h3 class="text-h6 mb-2">{{ noteReading.title }}</h3>
    <p class="text-body-2 mb-3">{{ noteReading.summary }}</p>
    <p class="text-body-2 mb-3">Missing insurance details on file does not mean a patient is uninsured. Staff provide the note; this setting only proposes reading details already in it.</p>
    <v-radio-group :model-value="modelValue.enabled" label="Read insurance details provided by staff in appointment notes?" color="primary" hide-details="auto"
      @update:model-value="emit('update:enabled', $event === true)">
      <v-radio label="No" :value="false" /><v-radio label="Yes" :value="true" />
    </v-radio-group>
    <template v-if="modelValue.enabled">
      <p class="text-body-2 mb-2">{{ noteReading.format_intro }}</p>
      <div data-test="note-reading-example" class="pa-3 bg-lightsecondary rounded text-body-2 mb-2 text-pre-wrap text-break">{{ noteReading.example }}</div>
      <p class="text-body-2 mb-3">{{ noteReading.format_outro }}</p>
      <v-radio-group :model-value="modelValue.mode" label="How should details from notes be reviewed?" color="primary" hide-details="auto"
        @update:model-value="emit('update:mode', $event as OnboardingNoteReadingMode)">
        <v-radio v-for="mode in noteReading.modes" :key="mode.value" :value="mode.value" class="mb-2">
          <template #label><div><p class="text-body-1">{{ mode.label }}</p><p class="text-body-2">{{ mode.summary }}</p></div></template>
        </v-radio>
      </v-radio-group>
    </template>
    <p class="text-body-2 mt-3">{{ noteReading.limits }}</p>
  </section>
</template>
