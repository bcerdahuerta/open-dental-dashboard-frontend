<script setup lang="ts">
import type { OnboardingWindowAnswers, OnboardingWindowField, OnboardingWindowQuestion } from '@/types/onboarding';
import { normalizeQuestionOptions } from '@/components/onboarding/questionOptions';
import { REQUIRED_WINDOW_MESSAGE, windowFieldMissing } from '@/components/onboarding/windowRequirements';

const props = defineProps<{ questions: OnboardingWindowQuestion[]; modelValue: OnboardingWindowAnswers }>();
const emit = defineEmits<{ 'update:field': [field: OnboardingWindowField, value: unknown] }>();

/** Fallback only; the API sends the canonical Monday-first options for working_days. */
const FALLBACK_WEEKDAYS = [
  { title: 'Monday', value: 0 },
  { title: 'Tuesday', value: 1 },
  { title: 'Wednesday', value: 2 },
  { title: 'Thursday', value: 3 },
  { title: 'Friday', value: 4 },
  { title: 'Saturday', value: 5 },
  { title: 'Sunday', value: 6 }
];

function optionItems(question: OnboardingWindowQuestion) {
  return normalizeQuestionOptions(question.options).map((option) => ({ title: option.label, value: String(option.value) }));
}

function weekdayItems(question: OnboardingWindowQuestion) {
  const items = normalizeQuestionOptions(question.options).map((option) => ({ title: option.label, value: Number(option.value) }));
  return items.length > 0 ? items : FALLBACK_WEEKDAYS;
}

function hintFor(question: OnboardingWindowQuestion): string {
  return windowFieldMissing(props.modelValue, question.field) ? REQUIRED_WINDOW_MESSAGE : question.help;
}

function valueFor(field: keyof OnboardingWindowAnswers) {
  return props.modelValue[field];
}

function setValue(field: OnboardingWindowField, value: unknown) {
  if (field === 'look_ahead_days') emit('update:field', field, Number(value));
  else if (field === 'review_times')
    emit(
      'update:field',
      field,
      String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    );
  else emit('update:field', field, value);
}
</script>

<template>
  <div data-test="window-questions">
    <div v-for="question in props.questions" :key="question.field" :data-test="`window-field-${question.field}`" class="mb-4">
      <v-text-field
        v-if="question.kind === 'number'"
        :model-value="valueFor(question.field)"
        :label="question.title"
        :hint="hintFor(question)"
        :min="question.minimum"
        :max="question.maximum"
        type="number"
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <v-select
        v-else-if="question.kind === 'choice'"
        :model-value="valueFor(question.field)"
        :items="optionItems(question)"
        item-title="title"
        item-value="value"
        :label="question.title"
        :hint="hintFor(question)"
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <v-select
        v-else-if="question.kind === 'weekdays'"
        :model-value="valueFor(question.field)"
        :items="weekdayItems(question)"
        item-title="title"
        item-value="value"
        :label="question.title"
        :hint="hintFor(question)"
        multiple
        chips
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <v-text-field
        v-else-if="question.kind === 'time'"
        :model-value="valueFor(question.field)"
        :label="question.title"
        :hint="hintFor(question)"
        type="time"
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <v-text-field
        v-else-if="question.kind === 'time_list'"
        :model-value="(valueFor(question.field) as string[]).join(', ')"
        :label="question.title"
        :hint="hintFor(question)"
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <v-text-field
        v-else
        :model-value="valueFor(question.field)"
        :label="question.title"
        :hint="hintFor(question)"
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <p class="text-caption text-medium-emphasis mt-1">{{ question.help }}</p>
    </div>
  </div>
</template>
