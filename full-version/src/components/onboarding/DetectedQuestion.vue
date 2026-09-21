<script setup lang="ts">
import { computed } from 'vue';
import type { OnboardingDetectedQuestion } from '@/types/onboarding';

const props = defineProps<{ question: OnboardingDetectedQuestion; modelValue: unknown }>();
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>();

const title = computed(() => props.question.question_key.replace(/_/g, ' '));
const hasSuggestion = computed(() => props.question.recommended !== null && props.question.recommended !== undefined);
const items = computed(() => props.question.options.map((option) => ({ title: option.label, value: JSON.stringify(option.value) })));
const selected = computed({
  get: () => JSON.stringify(props.modelValue),
  set: (value: string) => emit('update:modelValue', JSON.parse(value))
});
const evidence = computed(() => {
  if (!hasSuggestion.value) return '';
  const digits = props.question.basis.match(/\d+/g)?.join(' ') ?? '';
  const words = props.question.basis.replace(/\d+/g, ' ').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return digits ? `We saw ${digits} ${words}.` : `We saw ${words}.`;
});
</script>

<template>
  <div :data-test="`detected-question-${question.question_key}`" class="mb-4">
    <v-select
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      :label="title"
      variant="outlined"
      color="primary"
      hide-details="auto"
    />
    <p v-if="hasSuggestion" :data-test="`detected-evidence-${question.question_key}`" class="text-caption text-medium-emphasis mt-1">
      {{ evidence }}
    </p>
  </div>
</template>
