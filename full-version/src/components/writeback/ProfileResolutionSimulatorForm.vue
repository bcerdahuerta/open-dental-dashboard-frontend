<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ResolveExplainRequest } from '@/types/profileResolution';

const props = defineProps<{
    modelValue: ResolveExplainRequest;
    clients: Array<{ id: string; client_name: string }>;
    clinics: Array<{ id: string; clinic_name: string }>;
    clientSearch: string;
    clinicSearch: string;
    loadingClients?: boolean;
    loadingClinics?: boolean;
    loading?: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: ResolveExplainRequest): void;
    (e: 'update:selected-client-id', value: string): void;
    (e: 'update:selected-clinic-id', value: string): void;
    (e: 'update:client-search', value: string): void;
    (e: 'update:clinic-search', value: string): void;
    (e: 'submit'): void;
    (e: 'reset'): void;
    (e: 'preload-burch-maxout'): void;
}>();

const touched = ref(false);

const form = computed({
    get: () => props.modelValue,
    set: (value: ResolveExplainRequest) => emit('update:modelValue', value),
});

const verificationTypes = ['ELG', 'FBD', 'SHORT_FORM'];

const validationErrors = computed(() => {
    const errors: string[] = [];
    if (!form.value.client_id?.trim()) errors.push('Client ID es obligatorio.');
    if (!form.value.clinic_id?.trim()) errors.push('Clinic ID es obligatorio.');
    if (!form.value.verification_type?.trim()) errors.push('Verification Type es obligatorio.');
    if (!form.value.verification_status?.trim()) errors.push('Status es obligatorio.');
    return errors;
});

const canSubmit = computed(() => validationErrors.value.length === 0 && !props.loading);

function patchField<K extends keyof ResolveExplainRequest>(key: K, value: ResolveExplainRequest[K]) {
    form.value = {
        ...form.value,
        [key]: value,
    };
}

function onSubmit() {
    touched.value = true;
    if (!canSubmit.value) return;
    emit('submit');
}

function onReset() {
    touched.value = false;
    emit('reset');
}
</script>

<template>
    <v-card variant="outlined" class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold">Resolution Simulator</v-card-title>
        <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                Ingresá la combinación a simular. El sistema te muestra el winner y el waterfall de candidatos.
            </v-alert>

            <v-row>
                <v-col cols="12" md="6">
                    <v-autocomplete
                        :model-value="form.client_id"
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
                        @update:model-value="(value) => {
                            const nextValue = String(value ?? '');
                            patchField('client_id', nextValue);
                            emit('update:selected-client-id', nextValue);
                        }"
                        @update:search="(value) => emit('update:client-search', String(value ?? ''))"
                    />
                </v-col>

                <v-col cols="12" md="6">
                    <v-autocomplete
                        :model-value="form.clinic_id"
                        :search="clinicSearch"
                        :items="clinics"
                        item-title="clinic_name"
                        item-value="id"
                        label="Clinic"
                        variant="outlined"
                        density="compact"
                        color="primary"
                        hide-details="auto"
                        :loading="loadingClinics"
                        no-filter
                        clearable
                        @update:model-value="(value) => {
                            const nextValue = String(value ?? '');
                            patchField('clinic_id', nextValue);
                            emit('update:selected-clinic-id', nextValue);
                        }"
                        @update:search="(value) => emit('update:clinic-search', String(value ?? ''))"
                    />
                </v-col>

                <v-col cols="12" md="6">
                    <v-select
                        :model-value="form.verification_type"
                        :items="verificationTypes"
                        label="Verification Type"
                        variant="outlined"
                        density="compact"
                        color="primary"
                        @update:model-value="(value) => patchField('verification_type', String(value ?? ''))"
                    />
                </v-col>

                <v-col cols="12" md="6">
                    <v-text-field
                        :model-value="form.verification_status"
                        label="Status"
                        variant="outlined"
                        density="compact"
                        color="primary"
                        hint="Ejemplo: Max Out"
                        persistent-hint
                        @update:model-value="(value) => patchField('verification_status', String(value ?? ''))"
                    />
                </v-col>
            </v-row>

            <v-alert v-if="touched && validationErrors.length" type="warning" variant="tonal" density="compact" class="mb-3">
                <div class="font-weight-medium mb-1">Revisá estos campos antes de simular:</div>
                <ul class="pl-4">
                    <li v-for="errorText in validationErrors" :key="errorText">{{ errorText }}</li>
                </ul>
            </v-alert>

            <div class="d-flex flex-wrap ga-2">
                <v-btn color="secondary" variant="tonal" :disabled="loading" @click="emit('preload-burch-maxout')">
                    Preload Burch/Maxout
                </v-btn>

                <v-btn
                    data-testid="simulator-submit"
                    color="primary"
                    variant="flat"
                    :loading="loading"
                    :disabled="loading"
                    @click="onSubmit"
                >
                    Resolve & Explain
                </v-btn>

                <v-btn data-testid="simulator-reset" variant="text" :disabled="loading" @click="onReset">
                    Reset
                </v-btn>
            </div>
        </v-card-text>
    </v-card>
</template>
