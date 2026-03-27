<script setup lang="ts">
import { computed } from 'vue';
import type { BaseProfile } from '@/types/profileResolution';

const props = defineProps<{
    items: BaseProfile[];
    loading?: boolean;
    error?: string | null;
}>();

const headers = [
    { title: 'Profile ID', key: 'id', sortable: true },
    { title: 'Name', key: 'profile_name', sortable: true },
    { title: 'Context Requirements', key: 'context_requirements', sortable: false },
    { title: 'Active', key: 'is_active', sortable: true },
    { title: 'Created', key: 'created_at', sortable: true },
    { title: 'Updated', key: 'updated_at', sortable: true },
];

const hasItems = computed(() => props.items.length > 0);

function formatDate(value?: string) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}
</script>

<template>
    <v-card variant="outlined" class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold">Base Profiles Catalog (Read-only)</v-card-title>
        <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                Base profiles catalog with metadata and context requirements. No create/edit/delete in this phase.
            </v-alert>

            <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
                {{ error }}
            </v-alert>

            <v-data-table
                :headers="headers"
                :items="items"
                :loading="loading"
                item-value="id"
                class="border rounded-md"
                density="comfortable"
            >
                <template #item.context_requirements="{ item }">
                    <div v-if="Array.isArray(item.context_requirements) && item.context_requirements.length" class="d-flex flex-wrap ga-1">
                        <v-chip
                            v-for="requirement in item.context_requirements"
                            :key="`${item.id}-${requirement}`"
                            size="x-small"
                            color="primary"
                            variant="tonal"
                        >
                            {{ requirement }}
                        </v-chip>
                    </div>
                    <span v-else class="text-medium-emphasis">No extra context</span>
                </template>

                <template #item.is_active="{ item }">
                    <v-chip :color="item.is_active ? 'success' : 'error'" variant="tonal" size="small">
                        {{ item.is_active ? 'Active' : 'Inactive' }}
                    </v-chip>
                </template>

                <template #item.created_at="{ item }">
                    <span class="text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
                </template>

                <template #item.updated_at="{ item }">
                    <span class="text-medium-emphasis">{{ formatDate(item.updated_at) }}</span>
                </template>

                <template #no-data>
                    <div class="py-6 text-center text-medium-emphasis">
                        <span v-if="loading">Loading base profiles…</span>
                        <span v-else>No base profiles to display.</span>
                    </div>
                </template>
            </v-data-table>

            <v-alert v-if="!loading && !hasItems" type="info" variant="tonal" density="compact" class="mt-4">
                If you expected data, check API connectivity or user permissions.
            </v-alert>
        </v-card-text>
    </v-card>
</template>
