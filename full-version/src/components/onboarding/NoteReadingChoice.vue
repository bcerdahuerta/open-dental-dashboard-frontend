<script setup lang="ts">
import type { OnboardingNoteReadingChoice, OnboardingNoteReadingMode } from '@/types/onboarding';

const props = defineProps<{ noteReading: OnboardingNoteReadingChoice; modelValue: OnboardingNoteReadingMode }>();
const emit = defineEmits<{ 'update:modelValue': [mode: OnboardingNoteReadingMode] }>();
</script>

<template>
  <div data-test="note-reading-choice" class="mb-4">
    <h3 class="text-h6 mb-2">{{ props.noteReading.title }}</h3>
    <p class="text-body-2 text-medium-emphasis mb-3">{{ props.noteReading.summary }}</p>
    <p class="text-body-2 mb-2">{{ props.noteReading.format_intro }}</p>
    <pre data-test="note-reading-example" class="pa-3 bg-lightsecondary rounded text-body-2 mb-2">{{ props.noteReading.example }}</pre>
    <p class="text-body-2 mb-2">{{ props.noteReading.format_outro }}</p>
    <p class="text-caption text-medium-emphasis mb-3">{{ props.noteReading.limits }}</p>
    <v-radio-group
      :model-value="props.modelValue"
      color="primary"
      hide-details="auto"
      @update:model-value="emit('update:modelValue', $event as OnboardingNoteReadingMode)"
    >
      <v-radio v-for="mode in props.noteReading.modes" :key="mode.value" :value="mode.value" :data-test="`note-mode-${mode.value}`">
        <template #label>
          <div>
            <div class="text-body-1">{{ mode.label }}</div>
            <div class="text-caption text-medium-emphasis">{{ mode.summary }}</div>
          </div>
        </template>
      </v-radio>
    </v-radio-group>
  </div>
</template>
