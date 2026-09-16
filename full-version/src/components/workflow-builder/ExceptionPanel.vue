<script setup lang="ts">
import { computed, ref } from 'vue';
import type {
  WorkflowBlueprintVersion,
  WorkflowExceptionContext,
  WorkflowExceptionDelta,
  WorkflowExceptionHistory
} from '@/types/workflowBuilder';

const props = defineProps<{
  clinics: Array<{ id: string; clinic_name: string }>;
  baseVersions: WorkflowBlueprintVersion[];
  optionalAtomKeys: string[];
  context: WorkflowExceptionContext | null;
  history: WorkflowExceptionHistory | null;
  authenticatedSubjectId: string | null;
}>();
const emit = defineEmits<{
  loadContext: [value: { clinicId: string; baseVersionId: string }];
  create: [value: { clinicId: string; baseVersionId: string; delta: WorkflowExceptionDelta }];
  review: [value: { clinicId: string; exceptionId: string }];
  approve: [value: { clinicId: string; exceptionId: string }];
}>();
const clinicId = ref('');
const baseVersionId = ref('');
const rationale = ref('');
const addAtomKeys = ref<string[]>([]);
const removeAtomKeys = ref<string[]>([]);
const approvedBases = computed(() => props.baseVersions.filter((version) => version.state === 'APPROVED' && !version.disposition));
const overlappingAtomKeys = computed(() => addAtomKeys.value.filter((atomKey) => removeAtomKeys.value.includes(atomKey)));
const hasOverlappingAtomKeys = computed(() => overlappingAtomKeys.value.length > 0);

function loadContext(): void {
  if (clinicId.value && baseVersionId.value) emit('loadContext', { clinicId: clinicId.value, baseVersionId: baseVersionId.value });
}

function create(): void {
  if (hasOverlappingAtomKeys.value) return;
  if (!clinicId.value || !baseVersionId.value || !rationale.value || (!addAtomKeys.value.length && !removeAtomKeys.value.length)) return;
  emit('create', {
    clinicId: clinicId.value,
    baseVersionId: baseVersionId.value,
    delta: {
      delta_version: 'blueprint-clinic-exception-delta-v1',
      add_atom_keys: addAtomKeys.value,
      remove_atom_keys: removeAtomKeys.value,
      rationale: rationale.value
    }
  });
}
</script>

<template>
  <v-alert type="info" variant="tonal" class="mb-4">
    Sparse server-validated deltas only. Effective UNTIL_SUPERSEDED — no expiry. Authenticated subject:
    {{ authenticatedSubjectId ?? 'unavailable' }}. Server verifies separate exact exception approval eligibility.
  </v-alert>
  <v-select
    v-model="clinicId"
    data-test="exception-clinic-id"
    :items="clinics"
    item-title="clinic_name"
    item-value="id"
    label="Authorized clinic"
    variant="outlined"
    color="primary"
    hide-details="auto"
    class="mb-3"
  />
  <v-select
    v-model="baseVersionId"
    data-test="exception-base-version"
    :items="approvedBases"
    item-title="version_id"
    item-value="version_id"
    label="Approved base version"
    variant="outlined"
    color="primary"
    hide-details="auto"
    class="mb-3"
  />
  <v-alert v-if="approvedBases.length" type="info" variant="tonal" class="mb-3">
    Select one of the server-returned approved version IDs; the server validates the exact base.
  </v-alert>
  <v-btn data-test="load-exception-context" color="secondary" variant="tonal" :disabled="!clinicId || !baseVersionId" @click="loadContext"
    >Load server exception context</v-btn
  >
  <v-text-field
    v-model="rationale"
    data-test="exception-rationale"
    label="Sparse delta rationale"
    variant="outlined"
    color="primary"
    hide-details="auto"
    class="mt-3"
  />
  <div v-for="atomKey in optionalAtomKeys" :key="atomKey" class="d-flex ga-2 align-center mt-2">
    <v-checkbox
      v-model="addAtomKeys"
      :data-test="`exception-add-${atomKey}`"
      :value="atomKey"
      :label="`Add ${atomKey}`"
      color="primary"
      hide-details
    />
    <v-checkbox
      v-model="removeAtomKeys"
      :data-test="`exception-remove-${atomKey}`"
      :value="atomKey"
      :label="`Remove ${atomKey}`"
      color="primary"
      hide-details
    />
  </div>
  <v-alert v-if="hasOverlappingAtomKeys" data-test="exception-overlap-message" type="warning" variant="tonal" class="mt-3">
    Each optional atom can be added or removed, not both. Remove {{ overlappingAtomKeys.join(', ') }} from one side before creating the
    sparse exception. Your selections are preserved.
  </v-alert>
  <v-btn data-test="create-exception" color="primary" variant="flat" class="mt-3" :disabled="hasOverlappingAtomKeys" @click="create"
    >Create sparse exception</v-btn
  >
  <v-alert v-if="context" type="info" variant="tonal" class="mt-4">Base {{ context.base_version.version_id }} is server-validated.</v-alert>
  <v-list v-if="history?.exceptions.length" density="compact" class="border rounded mt-4">
    <v-list-item v-for="exception in history.exceptions" :key="exception.exception_id" data-test="exception-history-row">
      <v-list-item-title>{{ exception.exception_id }}</v-list-item-title>
      <v-list-item-subtitle data-test="exception-history-linkage"
        >{{ exception.state }} · UNTIL_SUPERSEDED · delta {{ exception.delta_digest }} · base {{ exception.base_version_id }} · base digest
        {{ exception.base_version_digest }}</v-list-item-subtitle
      >
      <template #append>
        <v-btn
          v-if="exception.state === 'DRAFT'"
          data-test="review-exception"
          color="primary"
          variant="outlined"
          size="small"
          :disabled="!clinicId"
          @click="emit('review', { clinicId, exceptionId: exception.exception_id })"
          >Submit review</v-btn
        >
        <v-btn
          v-if="exception.state === 'IN_REVIEW'"
          data-test="approve-exception"
          color="primary"
          variant="flat"
          size="small"
          :disabled="!clinicId"
          @click="emit('approve', { clinicId, exceptionId: exception.exception_id })"
          >Request personal approval</v-btn
        >
      </template>
    </v-list-item>
  </v-list>
</template>
