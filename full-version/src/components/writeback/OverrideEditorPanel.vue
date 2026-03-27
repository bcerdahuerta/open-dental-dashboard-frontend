<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { ClinicOverride, BaseProfile, ResolveExplainResponse } from '@/types/profileResolution';
import { PREDEFINED_TARGET_STATUSES, VERIFICATION_TYPES, type ClinicOverrideFormData, type EditingMode } from '@/types/profileResolution';
import { useProfileResolutionStore } from '@/stores/profileResolution';
import ProfileResolutionExplainPanel from './ProfileResolutionExplainPanel.vue';

const props = defineProps<{
    clinicId: string;
    clientIdForContext?: string;
}>();

const emit = defineEmits<{
    (e: 'saved'): void;
    (e: 'cancelled'): void;
}>();

const profileResolutionStore = useProfileResolutionStore();
const {
    baseProfiles,
    editingOverride,
    isPanelOpen,
    editingMode,
    loading,
} = storeToRefs(profileResolutionStore);

// Form state
const formData = ref<ClinicOverrideFormData>({
    clinic_id: '',
    client_assignment_id: null,
    override_base_profile_id: '',
    verification_type: 'ELG',
    target_statuses: [],
    precedence: 50,
    context_rules: {
        has_shortform: false,
    },
});

const formErrors = ref<Record<string, string>>({});
const isDirty = ref(false);
const showPreview = ref(false);
const previewResponse = ref<ResolveExplainResponse | null>(null);
const loadingPreview = ref(false);

// Deep copy for dirty detection
const originalFormData = ref<string>('');

// Computed filtered base profiles by verification type
const filteredBaseProfiles = computed<BaseProfile[]>(() => {
    const vType = formData.value.verification_type;
    return baseProfiles.value.filter(
        (profile) => profile.verification_type === vType && profile.is_active,
    );
});

const panelTitle = computed(() => {
    if (editingMode.value === 'edit') {
        return 'Edit Clinic Override';
    }
    return 'Create Clinic Override';
});

const saveButtonText = computed(() => {
    if (showPreview.value) {
        return 'Confirm & Save';
    }
    return 'Preview Before Save';
});

// Initialize form when editing an existing override
watch([editingOverride, () => props.clinicId], ([override, clinicId]) => {
    if (override) {
        formData.value = {
            clinic_id: override.clinic_id,
            client_assignment_id: override.client_assignment_id ?? null,
            override_base_profile_id: override.override_base_profile_id,
            verification_type: override.verification_type,
            target_statuses: [...(override.target_statuses || [])],
            precedence: override.precedence,
            context_rules: {
                has_shortform: (override.context_rules?.has_shortform as boolean) ?? false,
            },
        };
    } else {
        resetForm(clinicId);
    }
    originalFormData.value = JSON.stringify(formData.value);
    isDirty.value = false;
    showPreview.value = false;
    previewResponse.value = null;
}, { immediate: true });

// Track dirty state
watch(formData, (newVal) => {
    isDirty.value = JSON.stringify(newVal) !== originalFormData.value;
}, { deep: true });

function resetForm(clinicId: string) {
    formData.value = {
        clinic_id: clinicId,
        client_assignment_id: null,
        override_base_profile_id: '',
        verification_type: 'ELG',
        target_statuses: [],
        precedence: 50,
        context_rules: {
            has_shortform: false,
        },
    };
    formErrors.value = {};
    showPreview.value = false;
    previewResponse.value = null;
}

function validateForm(): boolean {
    formErrors.value = {};

    if (!formData.value.override_base_profile_id) {
        formErrors.value.override_base_profile_id = 'Base Profile is required';
    }

    if (!formData.value.verification_type) {
        formErrors.value.verification_type = 'Verification Type is required';
    }

    if (formData.value.target_statuses.length === 0) {
        formErrors.value.target_statuses = 'At least one Target Status is required';
    }

    if (formData.value.precedence < 0 || formData.value.precedence > 100) {
        formErrors.value.precedence = 'Precedence must be between 0 and 100';
    }

    return Object.keys(formErrors.value).length === 0;
}

async function handlePreview() {
    if (!validateForm()) return;

    // Guard: Do not send preview if clientIdForContext is empty
    if (!props.clientIdForContext) {
        formErrors.value._preview = 'No client context available for preview. Please select a client first.';
        return;
    }

    // Build a minimal resolve_explain request for preview
    loadingPreview.value = true;
    try {
        const previewRequest = {
            client_id: props.clientIdForContext,
            clinic_id: props.clinicId,
            verification_type: formData.value.verification_type,
            verification_status: formData.value.target_statuses[0] || 'Max Out',
            has_shortform: formData.value.context_rules.has_shortform,
        };

        const response = await profileResolutionStore.resolveExplain(previewRequest);
        previewResponse.value = response;
        showPreview.value = true;
    } catch (err) {
        formErrors.value._preview = 'Failed to generate preview. Please try again.';
    } finally {
        loadingPreview.value = false;
    }
}

async function handleConfirmSave() {
    if (!validateForm()) return;

    try {
        if (editingMode.value === 'edit' && editingOverride.value) {
            await profileResolutionStore.updateOverride(editingOverride.value.id, formData.value);
        } else {
            await profileResolutionStore.createOverride(props.clinicId, formData.value);
        }

        profileResolutionStore.closePanel();
        emit('saved');
    } catch (err) {
        formErrors.value._save = 'Failed to save. Please try again.';
    }
}

function handleCancel() {
    if (isDirty.value) {
        emit('cancelled');
    } else {
        profileResolutionStore.closePanel();
    }
}

function handleClose() {
    if (isDirty.value) {
        emit('cancelled');
    } else {
        profileResolutionStore.closePanel();
    }
}
</script>

<template>
    <v-navigation-drawer
        :model-value="isPanelOpen"
        location="right"
        width="450"
        temporary
        @update:model-value="(v) => !v && handleClose()"
    >
        <v-card flat class="h-100 d-flex flex-column">
            <v-card-title class="d-flex align-center justify-space-between pa-4">
                <span class="text-h6">{{ panelTitle }}</span>
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    density="compact"
                    @click="handleClose"
                />
            </v-card-title>

            <v-divider />

            <v-card-text class="flex-grow-1 overflow-y-auto">
                <v-form @submit.prevent="handlePreview">
                    <!-- Verification Type -->
                    <v-select
                        v-model="formData.verification_type"
                        :items="VERIFICATION_TYPES"
                        item-title="label"
                        item-value="value"
                        label="Verification Type"
                        variant="outlined"
                        color="primary"
                        :error-messages="formErrors.verification_type"
                        class="mb-4"
                    >
                        <template #append-inner>
                            <v-tooltip location="top">
                                <template #activator="{ props: tooltipProps }">
                                    <v-icon v-bind="tooltipProps" size="small" color="medium-emphasis">
                                        mdi-information-outline
                                    </v-icon>
                                </template>
                                <span>The verification type this override applies to (ELG, INS, BNF)</span>
                            </v-tooltip>
                        </template>
                    </v-select>

                    <!-- Override Base Profile -->
                    <v-autocomplete
                        v-model="formData.override_base_profile_id"
                        :items="filteredBaseProfiles"
                        item-title="profile_name"
                        item-value="id"
                        label="Override Base Profile"
                        variant="outlined"
                        color="primary"
                        :error-messages="formErrors.override_base_profile_id"
                        class="mb-4"
                    >
                        <template #append-inner>
                            <v-tooltip location="top">
                                <template #activator="{ props: tooltipProps }">
                                    <v-icon v-bind="tooltipProps" size="small" color="medium-emphasis">
                                        mdi-information-outline
                                    </v-icon>
                                </template>
                                <span>Select the base profile to use as override. Filtered by verification type.</span>
                            </v-tooltip>
                        </template>
                    </v-autocomplete>

                    <!-- Target Statuses -->
                    <v-combobox
                        v-model="formData.target_statuses"
                        :items="[...PREDEFINED_TARGET_STATUSES]"
                        label="Target Statuses"
                        variant="outlined"
                        color="primary"
                        multiple
                        chips
                        closable-chips
                        :error-messages="formErrors.target_statuses"
                        class="mb-4"
                    >
                        <template #append-inner>
                            <v-tooltip location="top">
                                <template #activator="{ props: tooltipProps }">
                                    <v-icon v-bind="tooltipProps" size="small" color="medium-emphasis">
                                        mdi-information-outline
                                    </v-icon>
                                </template>
                                <span>Which verification statuses trigger this override</span>
                            </v-tooltip>
                        </template>
                        <template #chip="{ item, props: chipProps }">
                            <v-chip
                                v-bind="chipProps"
                                :text="item.title"
                                size="small"
                                color="primary"
                                variant="tonal"
                            />
                        </template>
                    </v-combobox>

                    <!-- Precedence -->
                    <v-text-field
                        v-model.number="formData.precedence"
                        label="Precedence"
                        type="number"
                        variant="outlined"
                        color="primary"
                        :min="0"
                        :max="100"
                        :error-messages="formErrors.precedence"
                        class="mb-4"
                    >
                        <template #append-inner>
                            <v-tooltip location="top">
                                <template #activator="{ props: tooltipProps }">
                                    <v-icon v-bind="tooltipProps" size="small" color="medium-emphasis">
                                        mdi-information-outline
                                    </v-icon>
                                </template>
                                <span>Higher values win in conflict resolution. Range: 0-100</span>
                            </v-tooltip>
                        </template>
                    </v-text-field>

                    <!-- Has Shortform -->
                    <v-switch
                        v-model="formData.context_rules.has_shortform"
                        label="Has Shortform"
                        color="primary"
                        class="mb-4"
                    >
                        <template #append>
                            <v-tooltip location="top">
                                <template #activator="{ props: tooltipProps }">
                                    <v-icon v-bind="tooltipProps" size="small" color="medium-emphasis">
                                        mdi-information-outline
                                    </v-icon>
                                </template>
                                <span>Whether this override requires shortform data in the patient record</span>
                            </v-tooltip>
                        </template>
                    </v-switch>

                    <!-- Error Messages -->
                    <v-alert v-if="formErrors._preview" type="error" variant="tonal" density="compact" class="mb-4">
                        {{ formErrors._preview }}
                    </v-alert>

                    <v-alert v-if="formErrors._save" type="error" variant="tonal" density="compact" class="mb-4">
                        {{ formErrors._save }}
                    </v-alert>

                    <!-- Preview Panel -->
                    <template v-if="showPreview && previewResponse">
                        <div class="text-subtitle-2 font-weight-bold mb-2">Preview Resolution</div>
                        <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                            Review the resolution result before confirming your changes.
                        </v-alert>
                        <ProfileResolutionExplainPanel
                            :response="previewResponse"
                            :loading="false"
                        />
                    </template>
                </v-form>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-4">
                <v-spacer />
                <v-btn
                    variant="tonal"
                    color="secondary"
                    @click="handleCancel"
                >
                    Cancel
                </v-btn>
                <v-btn
                    v-if="!showPreview"
                    color="primary"
                    variant="flat"
                    :loading="loadingPreview || loading"
                    @click="handlePreview"
                >
                    Preview
                </v-btn>
                <v-btn
                    v-else
                    color="primary"
                    variant="flat"
                    :loading="loading"
                    @click="handleConfirmSave"
                >
                    Confirm & Save
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-navigation-drawer>
</template>