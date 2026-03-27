<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ProfileResolutionHelpCallout from '@/components/writeback/ProfileResolutionHelpCallout.vue';
import ProfileResolutionSimulatorForm from '@/components/writeback/ProfileResolutionSimulatorForm.vue';
import ProfileResolutionExplainPanel from '@/components/writeback/ProfileResolutionExplainPanel.vue';
import ProfileResolutionHistoryList from '@/components/writeback/ProfileResolutionHistoryList.vue';
import BaseProfilesCatalogTable from '@/components/writeback/BaseProfilesCatalogTable.vue';
import ClientAssignmentsTable from '@/components/writeback/ClientAssignmentsTable.vue';
import ClinicOverridesTable from '@/components/writeback/ClinicOverridesTable.vue';
import AssignmentEditorPanel from '@/components/writeback/AssignmentEditorPanel.vue';
import OverrideEditorPanel from '@/components/writeback/OverrideEditorPanel.vue';
import { useProfileResolutionStore } from '@/stores/profileResolution';
import { useClientStore } from '@/stores/clients';
import { useClinicStore } from '@/stores/clinics';
import type { ClientAssignment, ClinicOverride } from '@/types/profileResolution';

const profileResolutionStore = useProfileResolutionStore();
const clientStore = useClientStore();
const clinicStore = useClinicStore();

const {
    baseProfiles,
    clientAssignments,
    clinicOverrides,
    simulatorInput,
    lastExplainResponse,
    sessionHistory,
    loading,
    error,
    loadingBaseProfiles,
    loadingClientAssignments,
    loadingClinicOverrides,
    loadingResolveExplain,
    isPanelOpen,
} = storeToRefs(profileResolutionStore);

const { clients } = storeToRefs(clientStore);

const activeTab = ref('simulator');
const selectedClientId = ref('');
const selectedClinicId = ref('');
const selectorLimit = 25;
const clientSearch = ref('');
const clinicSearch = ref('');

// Confirmation dialog state
const showConfirmDialog = ref(false);
const confirmDialogTitle = ref('');
const confirmDialogMessage = ref('');
const confirmDialogAction = ref<(() => Promise<void>) | null>(null);

// Unsaved changes tracking
const hasUnsavedChanges = ref(false);

let clientSearchDebounce: ReturnType<typeof setTimeout> | null = null;
let clinicSearchDebounce: ReturnType<typeof setTimeout> | null = null;

const simulatorModel = computed({
    get: () => simulatorInput.value,
    set: (nextValue) => profileResolutionStore.setSimulatorInput(nextValue),
});

const directClinicOverrides = computed(() => {
    if (!selectedClinicId.value) return [];
    return profileResolutionStore.getDirectClinicOverrides(selectedClinicId.value);
});

const pageError = computed(() => error.value || clientStore.error || clinicStore.error);
const clinicCatalog = computed(() =>
    clinicStore.clinics.map((clinic) => ({ id: clinic.id, clinic_name: clinic.clinic_name })),
);

const simulatorClinicCatalog = computed(() => {
    if (!simulatorInput.value.client_id) return clinicCatalog.value;
    return clinicStore.clinics
        .filter((clinic) => clinic.client_id === simulatorInput.value.client_id)
        .map((clinic) => ({ id: clinic.id, clinic_name: clinic.clinic_name }));
});

async function loadInitialData() {
    await profileResolutionStore.firstVisitPreloadAndFetch();
    await Promise.all([
        clientStore.fetchClients({ limit: selectorLimit }),
        clinicStore.fetchClinicCatalog({ limit: selectorLimit }),
    ]);
}

function scheduleClientSearch(search: string) {
    if (clientSearchDebounce) clearTimeout(clientSearchDebounce);
    clientSearchDebounce = setTimeout(async () => {
        await clientStore.fetchClients({ search: search.trim(), limit: selectorLimit });
    }, 300);
}

function scheduleClinicSearch(search: string) {
    if (clinicSearchDebounce) clearTimeout(clinicSearchDebounce);
    clinicSearchDebounce = setTimeout(async () => {
        await clinicStore.fetchClinicCatalog({
            search: search.trim(),
            limit: selectorLimit,
            clientId: selectedClientId.value || undefined,
        });
    }, 300);
}

async function onSubmitSimulator() {
    try {
        await profileResolutionStore.resolveExplain(simulatorInput.value);
    } catch {
        // error state rendered from store
    }
}

function onResetSimulator() {
    profileResolutionStore.resetSimulatorInput();
    profileResolutionStore.resetSimulatorSession();
}

function onPreloadBurchMaxout() {
    profileResolutionStore.preloadFirstVisit({
        clientId: selectedClientId.value || undefined,
        clinicId: selectedClinicId.value || undefined,
    });
}

function onSimulatorClientIdUpdate(nextClientId: string) {
    selectedClientId.value = nextClientId;
    if (!nextClientId) {
        if (simulatorInput.value.clinic_id) {
            profileResolutionStore.setSimulatorInput({ clinic_id: '' });
        }
        selectedClinicId.value = '';
    }
}

function onSimulatorClinicIdUpdate(nextClinicId: string) {
    selectedClinicId.value = nextClinicId;
}

// ============================================
// Assignment CRUD Handlers
// ============================================

function handleCreateAssignment() {
    hasUnsavedChanges.value = false;
    profileResolutionStore.setEditingAssignment(null, 'create');
}

function handleEditAssignment(assignment: ClientAssignment) {
    hasUnsavedChanges.value = false;
    profileResolutionStore.setEditingAssignment(assignment, 'edit');
}

function handleDeactivateAssignment(assignment: ClientAssignment) {
    confirmDialogTitle.value = 'Deactivate Assignment';
    confirmDialogMessage.value = `Are you sure you want to deactivate this assignment? This will set it to inactive but preserve the record.`;
    confirmDialogAction.value = async () => {
        await profileResolutionStore.deactivateAssignment(assignment.id);
    };
    showConfirmDialog.value = true;
}

function handleAssignmentSaved() {
    hasUnsavedChanges.value = false;
    profileResolutionStore.closePanel();
}

function handleAssignmentCancelled() {
    if (hasUnsavedChanges.value) {
        confirmDialogTitle.value = 'Discard Changes';
        confirmDialogMessage.value = 'You have unsaved changes. Are you sure you want to discard them?';
        confirmDialogAction.value = async () => {
            hasUnsavedChanges.value = false;
            profileResolutionStore.closePanel();
        };
        showConfirmDialog.value = true;
    } else {
        profileResolutionStore.closePanel();
    }
}

// ============================================
// Override CRUD Handlers
// ============================================

function handleCreateOverride() {
    hasUnsavedChanges.value = false;
    profileResolutionStore.setEditingOverride(null, 'create');
}

function handleEditOverride(override: ClinicOverride) {
    hasUnsavedChanges.value = false;
    profileResolutionStore.setEditingOverride(override, 'edit');
}

function handleDeactivateOverride(override: ClinicOverride) {
    confirmDialogTitle.value = 'Deactivate Override';
    confirmDialogMessage.value = `Are you sure you want to deactivate this override? This will set it to inactive but preserve the record.`;
    confirmDialogAction.value = async () => {
        await profileResolutionStore.deactivateOverride(override.id);
    };
    showConfirmDialog.value = true;
}

function handleOverrideSaved() {
    hasUnsavedChanges.value = false;
    profileResolutionStore.closePanel();
}

function handleOverrideCancelled() {
    if (hasUnsavedChanges.value) {
        confirmDialogTitle.value = 'Discard Changes';
        confirmDialogMessage.value = 'You have unsaved changes. Are you sure you want to discard them?';
        confirmDialogAction.value = async () => {
            hasUnsavedChanges.value = false;
            profileResolutionStore.closePanel();
        };
        showConfirmDialog.value = true;
    } else {
        profileResolutionStore.closePanel();
    }
}

// ============================================
// Confirmation Dialog Handlers
// ============================================

async function handleConfirmDialogConfirm() {
    if (confirmDialogAction.value) {
        try {
            await confirmDialogAction.value();
        } catch {
            // Error handled by store
        }
    }
    showConfirmDialog.value = false;
    confirmDialogAction.value = null;
}

function handleConfirmDialogCancel() {
    showConfirmDialog.value = false;
    confirmDialogAction.value = null;
}

// Track panel open state for dirty handling
watch(isPanelOpen, (isOpen) => {
    if (!isOpen) {
        hasUnsavedChanges.value = false;
    }
});

watch(selectedClientId, async (nextClientId) => {
    if (!nextClientId) {
        clientAssignments.value = [];
        return;
    }
    try {
        await profileResolutionStore.fetchClientAssignments(nextClientId);
        await clinicStore.fetchClinicCatalog({
            limit: selectorLimit,
            clientId: nextClientId,
            search: clinicSearch.value.trim() || undefined,
        });
    } catch {
        // error state rendered from store
    }
});

watch(selectedClinicId, async (nextClinicId) => {
    if (!nextClinicId) {
        clinicOverrides.value = [];
        return;
    }
    try {
        await profileResolutionStore.fetchClinicOverrides(nextClinicId);
    } catch {
        // error state rendered from store
    }
});

watch(clientSearch, (nextSearch) => {
    scheduleClientSearch(nextSearch);
});

watch(clinicSearch, (nextSearch) => {
    scheduleClinicSearch(nextSearch);
});

onMounted(async () => {
    await loadInitialData();
});
</script>

<template>
    <v-row>
        <v-col cols="12">
            <ProfileResolutionHelpCallout class="mb-6" />

            <UiParentCard title="Profile Resolution">
                <v-alert v-if="pageError" type="error" variant="tonal" class="mb-4" closable>
                    {{ pageError }}
                </v-alert>

                <v-tabs v-model="activeTab" color="primary" align-tabs="start" class="mb-4">
                    <v-tab value="simulator">Simulator</v-tab>
                    <v-tab value="base-profiles">Base Profiles</v-tab>
                    <v-tab value="client-assignments">Client Assignments</v-tab>
                    <v-tab value="clinic-overrides">Clinic Overrides</v-tab>
                </v-tabs>

                <v-window v-model="activeTab">
                    <v-window-item value="simulator">
                        <v-row>
                            <v-col cols="12" lg="5">
                                <ProfileResolutionSimulatorForm
                                    v-model="simulatorModel"
                                    :clients="clients"
                                    :clinics="simulatorClinicCatalog"
                                    :client-search="clientSearch"
                                    :clinic-search="clinicSearch"
                                    :loading-clients="clientStore.loading"
                                    :loading-clinics="clinicStore.loading"
                                    :loading="loadingResolveExplain"
                                    @update:selected-client-id="onSimulatorClientIdUpdate"
                                    @update:selected-clinic-id="onSimulatorClinicIdUpdate"
                                    @update:client-search="clientSearch = $event"
                                    @update:clinic-search="clinicSearch = $event"
                                    @submit="onSubmitSimulator"
                                    @reset="onResetSimulator"
                                    @preload-burch-maxout="onPreloadBurchMaxout"
                                />
                            </v-col>

                            <v-col cols="12" lg="7">
                                <ProfileResolutionExplainPanel
                                    :response="lastExplainResponse"
                                    :loading="loadingResolveExplain"
                                    class="mb-4"
                                />
                                <ProfileResolutionHistoryList
                                    :history="sessionHistory"
                                    :loading="loadingResolveExplain"
                                    @replay="profileResolutionStore.replayHistory"
                                    @clear="profileResolutionStore.resetSimulatorSession"
                                />
                            </v-col>
                        </v-row>
                    </v-window-item>

                    <v-window-item value="base-profiles">
                        <BaseProfilesCatalogTable
                            :items="baseProfiles"
                            :loading="loadingBaseProfiles || loading"
                            :error="pageError"
                        />
                    </v-window-item>

                    <v-window-item value="client-assignments">
                        <ClientAssignmentsTable
                            :clients="clients"
                            :selected-client-id="selectedClientId"
                            :client-search="clientSearch"
                            :items="clientAssignments"
                            :loading-clients="clientStore.loading"
                            :loading="loadingClientAssignments"
                            :error="pageError"
                            @update:selected-client-id="selectedClientId = $event"
                            @update:client-search="clientSearch = $event"
                            @create-assignment="handleCreateAssignment"
                            @edit-assignment="handleEditAssignment"
                            @deactivate-assignment="handleDeactivateAssignment"
                        />
                    </v-window-item>

                    <v-window-item value="clinic-overrides">
                        <ClinicOverridesTable
                            :clinics="clinicCatalog"
                            :selected-clinic-id="selectedClinicId"
                            :clinic-search="clinicSearch"
                            :items="directClinicOverrides"
                            :loading-clinics="clinicStore.loading"
                            :loading="loadingClinicOverrides"
                            :error="pageError"
                            @update:selected-clinic-id="selectedClinicId = $event"
                            @update:clinic-search="clinicSearch = $event"
                            @create-override="handleCreateOverride"
                            @edit-override="handleEditOverride"
                            @deactivate-override="handleDeactivateOverride"
                        />
                    </v-window-item>
                </v-window>
            </UiParentCard>
        </v-col>
    </v-row>

    <!-- Assignment Editor Panel -->
    <AssignmentEditorPanel
        :client-id="selectedClientId"
        :client-id-for-context="selectedClientId"
        @saved="handleAssignmentSaved"
        @cancelled="handleAssignmentCancelled"
    />

    <!-- Override Editor Panel -->
    <OverrideEditorPanel
        :clinic-id="selectedClinicId"
        :client-id-for-context="selectedClientId"
        @saved="handleOverrideSaved"
        @cancelled="handleOverrideCancelled"
    />

    <!-- Confirmation Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="500">
        <v-card>
            <v-card-title class="text-h6">{{ confirmDialogTitle }}</v-card-title>
            <v-card-text>{{ confirmDialogMessage }}</v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="tonal" @click="handleConfirmDialogCancel">
                    Cancel
                </v-btn>
                <v-btn color="primary" variant="flat" @click="handleConfirmDialogConfirm">
                    Confirm
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>