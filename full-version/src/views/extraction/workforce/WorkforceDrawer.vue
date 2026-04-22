<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { XIcon, DeviceFloppyIcon, EditIcon } from 'vue-tabler-icons';
import WorkforceAssignmentPanel from '@/views/extraction/workforce/WorkforceAssignmentPanel.vue';
import WorkforceAnalyticsPanel from '@/views/extraction/workforce/WorkforceAnalyticsPanel.vue';
import type { Encargado, EncargadoAnalytics, WorkforceDrawerMode } from '@/types/extraction';

const props = defineProps<{
  modelValue: boolean;
  mode: WorkforceDrawerMode;
  member: Encargado | null;
  analytics: EncargadoAnalytics | null;
  analyticsLoading: boolean;
  submitLoading: boolean;
  reassignmentPending: boolean;
  clinicItems: Array<{ title: string; value: string }>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
  (e: 'submit-create', payload: { name: string; email: string }): void;
  (e: 'submit-edit', payload: { name: string; email: string; is_active: boolean }): void;
  (e: 'save-assignment', clinicIds: string[]): void;
  (e: 'refresh-analytics'): void;
}>();

const form = ref({
  name: '',
  email: '',
  is_active: true,
});

watch(
  () => [props.mode, props.member?.id],
  () => {
    form.value = {
      name: props.member?.name ?? '',
      email: props.member?.email ?? '',
      is_active: props.member?.is_active ?? true,
    };
  },
  { immediate: true }
);

const drawerOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const title = computed(() => {
  if (props.mode === 'create') return 'Create Team Member';
  if (props.mode === 'edit') return 'Edit Team Member';
  return props.member?.name ?? 'Team Member Details';
});

function closeDrawer() {
  drawerOpen.value = false;
  emit('close');
}

function submitForm() {
  if (props.mode === 'create') {
    emit('submit-create', { name: form.value.name, email: form.value.email });
    return;
  }

  emit('submit-edit', {
    name: form.value.name,
    email: form.value.email,
    is_active: form.value.is_active,
  });
}
</script>

<template>
  <v-navigation-drawer
    v-model="drawerOpen"
    location="right"
    temporary
    width="520"
  >
    <div class="d-flex align-center justify-space-between px-4 py-3 border-b">
      <div>
        <div class="text-h6">{{ title }}</div>
        <div v-if="member && mode !== 'create'" class="text-caption text-medium-emphasis">
          {{ member.email }}
        </div>
      </div>
      <v-btn icon variant="text" size="small" @click="closeDrawer">
        <XIcon size="18" stroke-width="1.5" />
      </v-btn>
    </div>

    <div class="pa-4 d-flex flex-column ga-4">
      <v-card variant="outlined">
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="form.name"
                label="Name"
                color="primary"
                variant="outlined"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.email"
                label="Email"
                type="email"
                color="primary"
                variant="outlined"
                hide-details="auto"
              />
            </v-col>
            <v-col v-if="mode !== 'create'" cols="12">
              <v-switch v-model="form.is_active" color="primary" hide-details label="Active" />
            </v-col>
          </v-row>
          <div class="d-flex justify-end mt-4">
            <v-btn color="primary" variant="flat" :loading="submitLoading" @click="submitForm">
              <template #prepend>
                <DeviceFloppyIcon size="16" stroke-width="1.5" />
              </template>
              {{ mode === 'create' ? 'Create Team Member' : 'Save Changes' }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <template v-if="member && mode !== 'create'">
        <v-card variant="outlined">
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-1 font-weight-medium">Member Summary</div>
              <v-chip :color="member.is_active ? 'success' : 'grey'" size="small" variant="tonal">
                {{ member.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis mb-1">
              Resolved scope: {{ member.resolved_assignment_scope ?? 'unassigned' }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              <EditIcon size="14" stroke-width="1.5" class="mr-1" />
              Drawer keeps edit, reassignment, and analytics in one place.
            </div>
          </v-card-text>
        </v-card>

        <WorkforceAssignmentPanel
          :member="member"
          :clinic-items="clinicItems"
          :pending="reassignmentPending"
          @save="emit('save-assignment', $event)"
        />

        <div class="d-flex justify-end">
          <v-btn color="secondary" variant="tonal" size="small" @click="emit('refresh-analytics')">
            Refresh Analytics
          </v-btn>
        </div>

        <WorkforceAnalyticsPanel
          :analytics="analytics"
          :member="member"
          :loading="analyticsLoading"
        />
      </template>
    </div>
  </v-navigation-drawer>
</template>
