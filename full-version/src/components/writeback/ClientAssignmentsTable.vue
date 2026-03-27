<script setup lang="ts">
import { computed } from 'vue';
import type { ClientItem } from '@/stores/clients';
import type { ClientAssignment } from '@/types/profileResolution';

const props = defineProps<{
    clients: ClientItem[];
    selectedClientId: string;
    clientSearch: string;
    items: ClientAssignment[];
    loadingClients?: boolean;
    loading?: boolean;
    error?: string | null;
}>();

const emit = defineEmits<{
    (e: 'update:selectedClientId', value: string): void;
    (e: 'update:clientSearch', value: string): void;
    (e: 'createAssignment'): void;
    (e: 'editAssignment', assignment: ClientAssignment): void;
    (e: 'deactivateAssignment', assignment: ClientAssignment): void;
}>();

const headers = [
    { title: 'Verification Type', key: 'verification_type', sortable: true },
    { title: 'Target Statuses', key: 'target_statuses', sortable: false },
    { title: 'Base Profile ID', key: 'base_profile_id', sortable: true },
    { title: 'Precedence', key: 'precedence', sortable: true },
    { title: 'Active', key: 'is_active', sortable: true },
    { title: 'Created', key: 'created_at', sortable: true },
    { title: 'Updated', key: 'updated_at', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
];

const hasSelection = computed(() => !!props.selectedClientId);
const hasItems = computed(() => props.items.length > 0);

function formatDate(value?: string) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}
</script>

<template>
    <v-card variant="outlined" class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between">
            <span class="text-subtitle-1 font-weight-bold">Client Assignments</span>
            <v-btn
                v-if="hasSelection"
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-plus"
                @click="emit('createAssignment')"
            >
                Create Assignment
            </v-btn>
        </v-card-title>
        <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                Select a client to manage profile assignments. Assignments apply before clinic-level overrides.
            </v-alert>

            <v-autocomplete
                :model-value="selectedClientId"
                :search="clientSearch"
                :items="clients"
                item-title="client_name"
                item-value="id"
                label="Client"
                variant="outlined"
                density="compact"
                color="primary"
                hide-details="auto"
                :loading="loadingClients"
                no-filter
                clearable
                class="mb-4"
                @update:model-value="(value) => emit('update:selectedClientId', String(value ?? ''))"
                @update:search="(value) => emit('update:clientSearch', String(value ?? ''))"
            />

            <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
                {{ error }}
            </v-alert>

            <v-alert v-if="!hasSelection" type="info" variant="tonal" class="mb-4">
                Select a client to load their Client Assignments.
            </v-alert>

            <v-data-table
                :headers="headers"
                :items="items"
                :loading="loading"
                item-value="id"
                class="border rounded-md"
                density="comfortable"
                :no-data-text="hasSelection ? 'No assignments for this client.' : 'Select a client to start.'"
            >
                <template #item.target_statuses="{ item }">
                    <div
                        v-if="Array.isArray(item.target_statuses) && item.target_statuses.length"
                        class="d-flex flex-wrap ga-1"
                    >
                        <v-chip
                            v-for="status in item.target_statuses"
                            :key="`${item.id}-${status}`"
                            size="x-small"
                            color="primary"
                            variant="tonal"
                        >
                            {{ status }}
                        </v-chip>
                    </div>
                    <span v-else class="text-medium-emphasis">—</span>
                </template>

                <template #item.is_active="{ item }">
                    <div class="d-flex align-center ga-2">
                        <v-chip :color="item.is_active === false ? 'error' : 'success'" variant="tonal" size="small">
                            {{ item.is_active === false ? 'Inactive' : 'Active' }}
                        </v-chip>
                        <v-chip
                            v-if="item.is_active === false"
                            size="x-small"
                            color="warning"
                            variant="tonal"
                        >
                            Deactivated
                        </v-chip>
                    </div>
                </template>

                <template #item.created_at="{ item }">
                    <span class="text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
                </template>

                <template #item.updated_at="{ item }">
                    <span class="text-medium-emphasis">{{ formatDate(item.updated_at) }}</span>
                </template>

                <template #item.actions="{ item }">
                    <div class="d-flex ga-1">
                        <v-tooltip location="top">
                            <template #activator="{ props: tooltipProps }">
                                <v-btn
                                    v-bind="tooltipProps"
                                    icon="mdi-pencil"
                                    variant="text"
                                    size="small"
                                    color="primary"
                                    @click="emit('editAssignment', item)"
                                />
                            </template>
                            <span>Edit Assignment</span>
                        </v-tooltip>
                        <v-tooltip location="top">
                            <template #activator="{ props: tooltipProps }">
                                <v-btn
                                    v-bind="tooltipProps"
                                    icon="mdi-close-circle-outline"
                                    variant="text"
                                    size="small"
                                    color="error"
                                    :disabled="item.is_active === false"
                                    @click="emit('deactivateAssignment', item)"
                                />
                            </template>
                            <span>{{ item.is_active === false ? 'Already Deactivated' : 'Deactivate' }}</span>
                        </v-tooltip>
                    </div>
                </template>
            </v-data-table>

            <v-alert v-if="hasSelection && !loading && !hasItems" type="info" variant="tonal" density="compact" class="mt-4">
                This client has no explicit assignments. The system will use global/default fallbacks during resolution.
            </v-alert>
        </v-card-text>
    </v-card>
</template>
