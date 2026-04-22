<script setup lang="ts">
import { computed } from 'vue';
import { EyeIcon, PencilIcon, UsersIcon } from 'vue-tabler-icons';
import type { Encargado, WorkforceMetricState } from '@/types/extraction';

const props = defineProps<{
  members: Encargado[];
  loading: boolean;
  selectedId: string | null;
  search: string;
}>();

const emit = defineEmits<{
  (e: 'open', id: string): void;
  (e: 'edit', id: string): void;
  (e: 'reassign', id: string): void;
}>();

const filteredMembers = computed(() => {
  const query = props.search.trim().toLowerCase();
  if (!query) return props.members;
  return props.members.filter((member) => {
    return [member.name, member.email, member.resolved_assignment_scope ?? '']
      .some((value) => value.toLowerCase().includes(query));
  });
});

function analyticsState(member: Encargado): WorkforceMetricState {
  return member.analytics_status?.state ?? 'pending';
}

function analyticsColor(state: WorkforceMetricState): string {
  if (state === 'ready') return 'success';
  if (state === 'partial') return 'warning';
  if (state === 'unavailable') return 'grey';
  return 'info';
}

function scopeLabel(scope?: Encargado['resolved_assignment_scope']): string {
  if (scope === 'clinic') return 'Clinic-first';
  if (scope === 'client') return 'Legacy fallback';
  return 'Unassigned';
}

function workloadClinics(member: Encargado): number {
  return member.workload_summary?.resolved_clinic_count
    ?? member.resolved_assignment_clinic_ids?.length
    ?? member.clinic_ids.length;
}

function workloadClients(member: Encargado): number {
  return member.workload_summary?.resolved_client_count
    ?? member.resolved_assignment_client_ids?.length
    ?? member.client_ids.length;
}

function openMember(event: Event | undefined, id: string) {
  event?.stopPropagation?.();
  emit('open', id);
}

function editMember(event: Event | undefined, id: string) {
  event?.stopPropagation?.();
  emit('edit', id);
}

function reassignMember(event: Event | undefined, id: string) {
  event?.stopPropagation?.();
  emit('reassign', id);
}
</script>

<template>
  <v-table density="compact" hover>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Status</th>
        <th>Scope</th>
        <th class="text-right">Clinics</th>
        <th class="text-right">Clients</th>
        <th>Analytics</th>
        <th class="text-right">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="loading">
        <td colspan="8" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" size="28" />
        </td>
      </tr>
      <tr v-else-if="!filteredMembers.length">
        <td colspan="8" class="text-center py-8 text-medium-emphasis">
          No team members found. Create one to start assigning clinics.
        </td>
      </tr>
      <tr
        v-for="member in filteredMembers"
        :key="member.id"
        :class="member.id === selectedId ? 'bg-lightprimary' : undefined"
        style="cursor: pointer"
        @click="emit('open', member.id)"
      >
        <td class="font-weight-medium">{{ member.name }}</td>
        <td>{{ member.email }}</td>
        <td>
          <v-chip :color="member.is_active ? 'success' : 'grey'" size="small" variant="tonal">
            {{ member.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </td>
        <td>{{ scopeLabel(member.resolved_assignment_scope) }}</td>
        <td class="text-right">{{ workloadClinics(member) }} clinic<span v-if="workloadClinics(member) !== 1">s</span></td>
        <td class="text-right">{{ workloadClients(member) }} client<span v-if="workloadClients(member) !== 1">s</span></td>
        <td>
          <v-chip :color="analyticsColor(analyticsState(member))" size="small" variant="tonal">
            {{ analyticsState(member) }}
          </v-chip>
        </td>
        <td>
          <div class="d-flex justify-end ga-1">
            <v-btn
              :data-test="`workforce-open-${member.id}`"
              icon
              variant="text"
              size="small"
              @click="openMember($event, member.id)"
            >
              <EyeIcon size="16" stroke-width="1.5" />
            </v-btn>
            <v-btn
              :data-test="`workforce-edit-${member.id}`"
              icon
              variant="text"
              size="small"
              @click="editMember($event, member.id)"
            >
              <PencilIcon size="16" stroke-width="1.5" />
            </v-btn>
            <v-btn
              :data-test="`workforce-reassign-${member.id}`"
              icon
              variant="text"
              size="small"
              @click="reassignMember($event, member.id)"
            >
              <UsersIcon size="16" stroke-width="1.5" />
            </v-btn>
          </div>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>
