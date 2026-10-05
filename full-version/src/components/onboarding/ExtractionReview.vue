<script setup lang="ts">
import { computed } from 'vue';
import type { ExtractionSettings, ExtractionSetupQuestions } from '@/types/onboarding';
import { normalizeQuestionOptions } from '@/components/onboarding/questionOptions';
import { timezoneLabel } from '@/components/onboarding/windowRequirements';
const props = defineProps<{ settings: ExtractionSettings; questions: ExtractionSetupQuestions | null; disabled?: boolean }>();
const emit = defineEmits<{ edit: [section: number] }>();
function optionLabel(key: string, value: string): string | undefined {
  return normalizeQuestionOptions(props.questions?.questions.find(q => q.question_key === key)?.options).find(o => o.value === value)?.label;
}
const practiceNames = computed(() => (props.settings.practice_refs ?? []).map(value => optionLabel('practices_in_scope', value) ?? 'Previously selected location (choices unavailable)'));
const source = computed(() => {
  const value = props.settings.insurance?.last_check_source;
  if (!value) return 'Not selected';
  return optionLabel('last_check_source', value) ?? ({ PLAN_VERIFICATION: 'Insurance plan check', PATIENT_VERIFICATION: 'Patient check', FORM_UPLOAD_DATE: 'Uploaded form date' }[value]);
});
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const notes = computed(() => {
  const value = props.settings.note_reading;
  if (value?.enabled === false) return 'Do not read insurance details from appointment notes.';
  if (value?.enabled !== true) return 'Not selected';
  return value.mode === 'APPLY_AUTOMATICALLY' ? 'Read staff-provided insurance details; propose automatic use.' : 'Read staff-provided insurance details; propose review before use.';
});
</script>

<template>
  <section data-test="extraction-review">
    <p class="text-body-1 mb-4">Review your proposed extraction settings. Saving here does not submit your full setup or start services.</p>
    <section class="border rounded pa-4 mb-4">
      <h3 class="text-h6">Practice</h3>
      <ul v-if="practiceNames.length" class="pl-5 my-2"><li v-for="(name, index) in practiceNames" :key="index" class="text-body-1">{{ name }}</li></ul>
      <p v-else class="text-body-1 my-2">No locations selected</p>
      <v-btn data-test="review-edit-practice" variant="text" color="primary" :disabled="disabled || !questions" @click="emit('edit', 1)">Edit practice</v-btn>
    </section>
    <section class="border rounded pa-4 mb-4">
      <h3 class="text-h6">Schedule</h3>
      <dl class="text-body-1 my-2">
        <dt class="font-weight-medium">Visit horizon</dt>
        <dd class="mb-2">{{ settings.window?.look_ahead_days ?? 'Not selected' }} {{ settings.window?.day_counting === 'BUSINESS_DAYS' ? 'business days' : settings.window?.day_counting === 'CALENDAR_DAYS' ? 'calendar days' : '(counting not selected)' }}</dd>
        <template v-if="settings.window?.day_counting === 'BUSINESS_DAYS'"><dt class="font-weight-medium">Counting weekdays</dt><dd class="mb-2">{{ settings.window?.working_days?.map(day => weekdays[day]).join(', ') || 'Not selected' }}</dd></template>
        <dt class="font-weight-medium">Daily reading time</dt><dd class="mb-2">{{ settings.window?.extraction_time || 'Not selected' }}</dd>
        <dt class="font-weight-medium">Recheck times</dt><dd class="mb-2">{{ settings.window?.review_times?.join(', ') || 'Not selected' }}</dd>
        <dt class="font-weight-medium">Practice timezone</dt><dd>{{ timezoneLabel(settings.window?.timezone) }}</dd>
      </dl>
      <v-btn data-test="review-edit-schedule" variant="text" color="primary" :disabled="disabled || !questions" @click="emit('edit', 2)">Edit schedule</v-btn>
    </section>
    <section class="border rounded pa-4 mb-4">
      <h3 class="text-h6">Insurance information</h3>
      <dl class="text-body-1 my-2">
        <dt class="font-weight-medium">Last verification source</dt><dd class="mb-2">{{ source }}</dd>
        <dt class="font-weight-medium">Eligibility-only insurers</dt><dd class="mb-2 text-break">{{ settings.insurance?.eligibility_only_carriers?.join(', ') || 'None selected' }}</dd>
        <dt class="font-weight-medium">Appointment notes</dt><dd>{{ notes }}</dd>
      </dl>
      <v-btn data-test="review-edit-insurance" variant="text" color="primary" :disabled="disabled || !questions" @click="emit('edit', 3)">Edit insurance information</v-btn>
    </section>
  </section>
</template>
