<script setup lang="ts">
import { computed } from 'vue';
import type { SimulatorHistoryEntry } from '@/types/profileResolution';

const props = defineProps<{
    history: SimulatorHistoryEntry[];
    loading?: boolean;
}>();

const emit = defineEmits<{
    (e: 'replay', entryId: string): void;
    (e: 'clear'): void;
}>();

const hasHistory = computed(() => props.history.length > 0);

function formatDate(value: string) {
    return new Date(value).toLocaleString();
}
</script>

<template>
    <v-card variant="outlined" class="rounded-lg h-100">
        <v-card-title class="d-flex align-center justify-space-between ga-2 text-subtitle-1 font-weight-bold">
            <span>Session History</span>
            <v-btn variant="text" color="error" size="small" :disabled="!hasHistory || loading" @click="emit('clear')">
                Clear
            </v-btn>
        </v-card-title>
        <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                Historial en memoria para esta visita. No se persiste al recargar.
            </v-alert>

            <template v-if="!hasHistory">
                <div class="text-body-2 text-medium-emphasis">Todavía no hay simulaciones guardadas en esta sesión.</div>
            </template>

            <v-list v-else density="compact" class="pa-0">
                <v-list-item v-for="entry in history" :key="entry.id" class="px-0">
                    <div class="d-flex flex-column w-100">
                        <div class="d-flex align-center justify-space-between ga-2">
                            <div class="text-body-2 font-weight-medium">
                                {{ entry.request.verification_type }} · {{ entry.request.verification_status }}
                            </div>
                            <v-btn
                                size="x-small"
                                color="primary"
                                variant="tonal"
                                :disabled="loading"
                                @click="emit('replay', entry.id)"
                            >
                                Replay
                            </v-btn>
                        </div>

                        <div class="text-caption text-medium-emphasis">
                            {{ entry.request.client_id }} / {{ entry.request.clinic_id }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            Normalized: {{ entry.normalized_request.verification_status_normalized }} · {{ formatDate(entry.created_at) }}
                        </div>
                    </div>
                </v-list-item>
            </v-list>
        </v-card-text>
    </v-card>
</template>
