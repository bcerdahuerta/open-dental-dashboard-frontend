<script setup lang="ts">
import { computed } from 'vue';
import type { OnboardingDetectedQuestion } from '@/types/onboarding';
import { normalizeQuestionOptions } from '@/components/onboarding/questionOptions';

const props = defineProps<{ question: OnboardingDetectedQuestion; modelValue: unknown }>();
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>();

function humanizeKey(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
}

const title = computed(() => (props.question.title?.trim() ? props.question.title : humanizeKey(props.question.question_key)));
const help = computed(() => props.question.help?.trim() ?? '');
const evidence = computed(() => props.question.evidence?.trim() ?? '');
const options = computed(() => normalizeQuestionOptions(props.question.options));
const items = computed(() => options.value.map((option) => ({ title: option.label, value: JSON.stringify(option.value ?? null) })));
const selected = computed({
  get: () => JSON.stringify(props.modelValue ?? null),
  set: (value: string) => emit('update:modelValue', JSON.parse(value))
});
</script>

<template>
  <div v-if="options.length > 0" :data-test="`detected-question-${question.question_key}`" class="mb-4">
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
    <p v-if="help" :data-test="`detected-help-${question.question_key}`" class="text-caption text-medium-emphasis mt-1">{{ help }}</p>
    <p v-if="evidence" :data-test="`detected-evidence-${question.question_key}`" class="text-caption text-medium-emphasis mt-1">
      {{ evidence }}
    </p>
  </div>
</template>
