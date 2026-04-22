<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import type { Encargado } from '@/types/extraction';

const props = defineProps<{
  member: Encargado | null;
  clinicItems: Array<{ title: string; value: string }>;
  pending: boolean;
}>();

const emit = defineEmits<{
  (e: 'save', clinicIds: string[]): void;
}>();

const selectedClinicIds = ref<string[]>([]);

watch(
  () => props.member?.clinic_ids,
  (value) => {
    selectedClinicIds.value = [...(value ?? [])];
  },
  { immediate: true }
);

const legacyClientCount = computed(() => props.member?.client_ids.length ?? 0);
</script>

<template>
  <UiParentCard title="Clinic Reassignment">
    <div class="text-body-2 text-medium-emphasis mb-3">
      Clinics remain source of truth. Legacy client assignments stay visible for fallback context only.
    </div>

    <v-select
      v-model="selectedClinicIds"
      :items="clinicItems"
      item-title="title"
      item-value="value"
      label="Assigned Clinics"
      color="primary"
      variant="outlined"
      multiple
      chips
      closable-chips
      hide-details="auto"
    />

    <div class="d-flex align-center justify-space-between mt-4">
      <div class="text-caption text-medium-emphasis">
        Legacy fallback clients: {{ legacyClientCount }}
      </div>
      <v-btn color="primary" variant="flat" :loading="pending" @click="emit('save', selectedClinicIds)">
        Save Assignment
      </v-btn>
    </div>
  </UiParentCard>
</template>
