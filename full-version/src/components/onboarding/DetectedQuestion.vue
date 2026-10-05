<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { OnboardingDetectedQuestion } from '@/types/onboarding';
import { normalizeQuestionOptions } from '@/components/onboarding/questionOptions';

const props = defineProps<{ question: OnboardingDetectedQuestion; modelValue: unknown }>();
const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>();
const title = computed(() => props.question.title || props.question.question_key.replace(/_/g, ' '));
const options = computed(() => normalizeQuestionOptions(props.question.options));
const isPractice = computed(() => props.question.question_key === 'practices_in_scope');
const isCarriers = computed(() => props.question.question_key === 'eligibility_only_carriers');
const values = computed(() => Array.isArray(props.modelValue) ? props.modelValue as string[] : []);
const exceptions = ref(values.value.length > 0);
watch(() => props.modelValue, () => { if (values.value.length > 0) exceptions.value = true; });
const items = computed(() => [
  ...options.value.map(o => ({ title: o.label, value: o.value })),
  ...values.value.filter(value => !options.value.some(o => o.value === value)).map(value => ({
    title: isPractice.value ? 'Previously selected location (choices unavailable)' : `${value} (previously selected)`, value
  }))
]);
function toggleExceptions(value: boolean): void {
  exceptions.value = value;
  if (!value) emit('update:modelValue', []);
}
</script>

<template>
  <section :data-test="`detected-question-${question.question_key}`" class="mb-6">
    <h3 class="text-h6 mb-2">{{ title }}</h3>
    <p v-if="question.help" class="text-body-2 mb-3">{{ question.help }}</p>
    <template v-if="isCarriers">
      <v-radio-group :model-value="exceptions" label="Do any insurers need eligibility checks only?" color="primary" hide-details="auto"
        @update:model-value="toggleExceptions($event === true)">
        <v-radio label="No" :value="false" />
        <v-radio label="Yes" :value="true" />
      </v-radio-group>
      <v-autocomplete v-if="exceptions" :model-value="values" :items="items" item-title="title" item-value="value"
        label="Search and select insurers" multiple chips closable-chips variant="outlined" color="primary" hide-details="auto"
        @update:model-value="emit('update:modelValue', $event)" />
    </template>
    <template v-else-if="isPractice">
      <p v-if="options.length === 1 && values.length === 1 && values[0] === options[0].value" class="text-body-1" data-test="practice-confirmation">
        {{ options[0].label }} — your practice for this setup.
      </p>
      <v-autocomplete v-else :model-value="values" :items="items" item-title="title" item-value="value" label="Search and select practices"
        multiple chips closable-chips variant="outlined" color="primary" hide-details="auto"
        @update:model-value="emit('update:modelValue', $event)" />
      <p v-if="!options.length" class="text-body-2 mt-2">Practice choices are unavailable. Previously saved selections are kept.</p>
    </template>
    <v-radio-group v-else :model-value="modelValue" :label="title" color="primary" hide-details="auto"
      @update:model-value="emit('update:modelValue', $event)">
      <v-radio v-for="option in options" :key="String(option.value)" :value="option.value" class="border rounded pa-3 mb-2">
        <template #label>
          <div>
            <p class="text-body-1">{{ option.label }}</p>
            <p v-if="option.summary" class="text-body-2">{{ option.summary }}</p>
          </div>
        </template>
      </v-radio>
    </v-radio-group>
  </section>
</template>
