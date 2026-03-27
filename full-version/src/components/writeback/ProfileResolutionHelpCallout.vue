<script setup lang="ts">
import UiParentCard from '@/components/shared/UiParentCard.vue';

const cascade = [
    {
        key: 'clinic_override',
        label: '1) Clinic Override',
        description: 'Mayor prioridad. Si existe match para clínica, gana.',
        color: 'error',
    },
    {
        key: 'client_assignment',
        label: '2) Client Assignment',
        description: 'Se usa cuando no hubo override directo en clínica.',
        color: 'warning',
    },
    {
        key: 'global_default',
        label: '3) Global Default',
        description: 'Fallback global cuando no hay match específico.',
        color: 'info',
    },
    {
        key: 'legacy_client_profile',
        label: '4) Legacy Client Profile',
        description: 'Fallback final para compatibilidad histórica.',
        color: 'secondary',
    },
];
</script>

<template>
    <UiParentCard title="How resolution works (read-only)">
        <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
            Esta vista es <strong>solo lectura</strong>. No crea, no edita y no borra configuraciones.
            Sirve para entender por qué un perfil ganó para una combinación dada.
        </v-alert>

        <div class="text-subtitle-2 font-weight-bold mb-2">Glosario rápido</div>
        <v-list density="compact" class="pa-0 mb-4">
            <v-list-item title="Winner" subtitle="Perfil final seleccionado por la cascada." />
            <v-list-item title="Candidate" subtitle="Cada regla evaluada en orden de precedencia." />
            <v-list-item title="Normalized status" subtitle="Estado estandarizado que realmente se compara en backend." />
        </v-list>

        <div class="text-subtitle-2 font-weight-bold mb-2">Orden de cascada</div>
        <div class="d-flex flex-column ga-2 mb-4">
            <v-chip
                v-for="item in cascade"
                :key="item.key"
                :color="item.color"
                variant="tonal"
                size="small"
                class="justify-start"
            >
                {{ item.label }} — {{ item.description }}
            </v-chip>
        </div>

        <v-alert type="success" variant="tonal" density="comfortable" class="mb-2">
            <strong>Ejemplo guiado Burch/Maxout</strong><br />
            Verification Type: <code>ELG</code> + Status: <code>Max Out</code> → normaliza a <code>maxout</code>.
            Con eso podés ver exactamente qué candidate hizo match y por qué.
        </v-alert>

        <div class="text-caption text-medium-emphasis">
            Sugerencia: usá primero "Preload Burch/Maxout" en el simulador para una primera corrida explicativa.
        </div>
    </UiParentCard>
</template>
