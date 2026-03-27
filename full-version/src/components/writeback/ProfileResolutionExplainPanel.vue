<script setup lang="ts">
import { computed } from 'vue';
import type { ResolveExplainResponse, ResolutionScope } from '@/types/profileResolution';

const props = defineProps<{
    response: ResolveExplainResponse | null;
    loading?: boolean;
}>();

const precedenceColor: Record<ResolutionScope, string> = {
    clinic_override: 'error',
    client_assignment: 'warning',
    global_default: 'info',
    legacy_client_profile: 'secondary',
    unresolved: 'grey',
};

const winnerText = computed(() => {
    if (!props.response?.winner) return null;
    const winner = props.response.winner;
    return winner.profile?.name || winner.profile?.id;
});
</script>

<template>
    <v-card variant="outlined" class="rounded-lg h-100">
        <v-card-title class="text-subtitle-1 font-weight-bold">Explain Result</v-card-title>
        <v-card-text>
            <template v-if="loading">
                <div class="d-flex justify-center py-8">
                    <v-progress-circular indeterminate color="primary" />
                </div>
            </template>

            <template v-else-if="!response">
                <v-alert type="info" variant="tonal" density="comfortable">
                    Todavía no hay simulación. Completá el formulario y ejecutá <strong>Resolve & Explain</strong>.
                </v-alert>
            </template>

            <template v-else>
                <v-alert v-if="response.winner" type="success" variant="tonal" density="comfortable" class="mb-4">
                    <div class="text-subtitle-2 font-weight-bold mb-1">Winner</div>
                    <div class="mb-2">{{ winnerText }}</div>
                    <div class="d-flex flex-wrap ga-2">
                        <v-chip
                            size="small"
                            :color="precedenceColor[response.winner.scope]"
                            variant="tonal"
                        >
                            Scope: {{ response.winner.scope }}
                        </v-chip>
                        <v-chip size="small" color="primary" variant="tonal">
                            Precedence: {{ response.winner.precedence }}
                        </v-chip>
                    </div>
                </v-alert>

                <v-alert v-else type="warning" variant="tonal" density="comfortable" class="mb-4">
                    No se encontró winner para esta combinación (resultado unresolved).
                </v-alert>

                <v-card variant="tonal" color="primary" class="mb-4">
                    <v-card-text class="py-3">
                        <div class="text-caption text-medium-emphasis">Normalized status</div>
                        <div class="text-body-1 font-weight-bold">{{ response.normalized_status || '—' }}</div>
                    </v-card-text>
                </v-card>

                <div class="text-subtitle-2 font-weight-bold mb-2">Candidate waterfall</div>
                <v-timeline density="compact" side="end" class="pa-0">
                    <v-timeline-item
                        v-for="(candidate, idx) in response.candidates"
                        :key="`${candidate.scope}-${idx}`"
                        :dot-color="candidate.matched ? 'success' : 'grey'"
                        size="x-small"
                    >
                        <div class="d-flex align-center justify-space-between ga-2 mb-1">
                            <div class="d-flex align-center ga-2">
                                <v-chip
                                    :color="precedenceColor[candidate.scope]"
                                    variant="tonal"
                                    size="x-small"
                                >
                                    {{ candidate.scope }}
                                </v-chip>
                                <span class="text-body-2">Precedence {{ candidate.precedence }}</span>
                            </div>

                            <v-chip :color="candidate.matched ? 'success' : 'grey'" variant="tonal" size="x-small">
                                {{ candidate.matched ? 'matched' : 'no match' }}
                            </v-chip>
                        </div>

                        <div class="text-body-2 font-weight-medium">
                            {{ candidate.profile?.name || candidate.profile?.id || 'Sin perfil' }}
                        </div>
                        <div v-if="candidate.reason" class="text-caption text-medium-emphasis">
                            {{ candidate.reason }}
                        </div>
                    </v-timeline-item>
                </v-timeline>

                <v-alert v-if="response.candidates.length === 0" type="info" variant="tonal" density="comfortable" class="mt-2">
                    El backend no devolvió candidatos para esta simulación.
                </v-alert>
            </template>
        </v-card-text>
    </v-card>
</template>
