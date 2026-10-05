<script setup lang="ts">
import { computed } from 'vue';
import type { ExtractionWindowSettings, OnboardingWindowField, OnboardingWindowQuestion } from '@/types/onboarding';
import { normalizeQuestionOptions } from '@/components/onboarding/questionOptions';
import { REQUIRED_WINDOW_MESSAGE, TIMEZONE_OPTIONS, windowFieldMissing } from '@/components/onboarding/windowRequirements';

const props = defineProps<{ questions: OnboardingWindowQuestion[]; modelValue: ExtractionWindowSettings }>();
const emit = defineEmits<{ 'update:field': [field: OnboardingWindowField, value: unknown] }>();
const visibleQuestions = computed(() => props.questions.filter(q => q.field !== 'working_days' || props.modelValue.day_counting === 'BUSINESS_DAYS'));
function optionItems(question: OnboardingWindowQuestion) {
  const offered = normalizeQuestionOptions(question.options).map(o => ({ title: o.label, value: o.value }));
  if (question.kind !== 'timezone') return offered;
  // Backend accepts IANA zones rather than a fixed option enum. Never select a zone by default.
  const items = offered.length ? offered : TIMEZONE_OPTIONS;
  const saved = props.modelValue.timezone;
  return saved && !items.some(o => o.value === saved) ? [...items, { title: saved, value: saved }] : items;
}
function helpFor(question: OnboardingWindowQuestion): string {
  if (question.field === 'working_days') return 'These weekdays count toward your visit horizon, not the days extraction runs. Monday is the first day.';
  if (question.field === 'day_counting') return 'Business days count only the weekdays you choose. Calendar days count every day, including weekends. These choices do not set execution days.';
  if (question.field === 'timezone') return 'All times use the practice timezone. EST/EDT, CST/CDT, MST/MDT and PST/PDT follow daylight saving time. Most of Arizona stays on MST; Navajo Nation follows Mountain Time.';
  return question.help;
}
function hintFor(question: OnboardingWindowQuestion): string {
  return windowFieldMissing(props.modelValue, question.field) ? REQUIRED_WINDOW_MESSAGE : '';
}
function setValue(field: OnboardingWindowField, value: unknown): void {
  if (field === 'look_ahead_days') emit('update:field', field, value === '' || value === null ? undefined : Number(value));
  else if (field === 'review_times') emit('update:field', field, String(value ?? '').split(',').map(v => v.trim()).filter(Boolean));
  else emit('update:field', field, value);
}
</script>

<template>
  <section data-test="window-questions">
    <div v-for="question in visibleQuestions" :key="question.field" :data-test="`window-field-${question.field}`" class="mb-5">
      <v-text-field v-if="question.kind === 'number'" :model-value="modelValue[question.field]" :label="question.title"
        :hint="hintFor(question)" persistent-hint :min="question.minimum" :max="question.maximum" type="number"
        variant="outlined" color="primary" hide-details="auto" @update:model-value="setValue(question.field, $event)" />
      <v-select v-else-if="['choice', 'weekdays', 'timezone'].includes(question.kind)" :model-value="modelValue[question.field]"
        :items="optionItems(question)" item-title="title" item-value="value" :label="question.field === 'working_days' ? 'Which weekdays count toward the horizon?' : question.title"
        :hint="hintFor(question)" persistent-hint :multiple="question.kind === 'weekdays'" :chips="question.kind === 'weekdays'"
        variant="outlined" color="primary" hide-details="auto" @update:model-value="setValue(question.field, $event)" />
      <v-text-field v-else :model-value="question.kind === 'time_list' ? (modelValue.review_times ?? []).join(', ') : modelValue[question.field]"
        :label="question.title" :hint="hintFor(question)" persistent-hint :type="question.kind === 'time' ? 'time' : 'text'"
        variant="outlined" color="primary" hide-details="auto" @update:model-value="setValue(question.field, $event)" />
      <p class="text-body-2 mt-2">{{ helpFor(question) }}</p>
      <p v-if="question.kind === 'time_list'" class="text-body-2 mt-1">Use 24-hour times separated by commas, for example 13:00, 16:00.</p>
    </div>
  </section>
</template>
