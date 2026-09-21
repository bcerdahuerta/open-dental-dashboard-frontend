<script setup lang="ts">
import type { OnboardingWindowAnswers, OnboardingWindowField, OnboardingWindowQuestion } from '@/types/onboarding';

const props = defineProps<{ questions: OnboardingWindowQuestion[]; modelValue: OnboardingWindowAnswers }>();
const emit = defineEmits<{ 'update:field': [field: OnboardingWindowField, value: unknown] }>();

const weekdays = [
  { title: 'Monday', value: 1 },
  { title: 'Tuesday', value: 2 },
  { title: 'Wednesday', value: 3 },
  { title: 'Thursday', value: 4 },
  { title: 'Friday', value: 5 },
  { title: 'Saturday', value: 6 },
  { title: 'Sunday', value: 0 }
];

function optionItems(question: OnboardingWindowQuestion) {
  return (question.options ?? []).map((option) => ({ title: option.label, value: String(option.value) }));
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
        :hint="question.help"
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
        :hint="question.help"
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <v-select
        v-else-if="question.kind === 'weekdays'"
        :model-value="valueFor(question.field)"
        :items="weekdays"
        item-title="title"
        item-value="value"
        :label="question.title"
        :hint="question.help"
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
        :hint="question.help"
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
        :hint="question.help"
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <v-text-field
        v-else
        :model-value="valueFor(question.field)"
        :label="question.title"
        :hint="question.help"
        variant="outlined"
        color="primary"
        hide-details="auto"
        @update:model-value="setValue(question.field, $event)"
      />
      <p class="text-caption text-medium-emphasis mt-1">{{ question.help }}</p>
    </div>
  </div>
</template>
