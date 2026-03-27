import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import type {
    BaseProfile,
    ClinicOverride,
    ClientAssignment,
    ResolveExplainRequest,
    ResolveExplainResponse,
    ResolveExplainNormalizedRequest,
    SimulatorHistoryEntry,
    EditingState,
    ClientAssignmentFormData,
    ClinicOverrideFormData,
    EditingMode,
} from '@/types/profileResolution';

const apiUrl = import.meta.env.VITE_API_URL;

const FIRST_VISIT_PRELOAD = {
    verification_type: 'ELG',
    verification_status: 'Max Out',
} as const;

function normalizeStatus(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .join('');
}

function buildHistoryId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `sim-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function ensureString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function parseBaseProfiles(payload: unknown): BaseProfile[] {
    return asArray<Record<string, unknown>>(payload).map((row) => ({
        ...row,
        id: ensureString(row.id),
        profile_name: ensureString(row.profile_name),
        context_requirements: asArray<string>(row.context_requirements),
        is_active: Boolean(row.is_active),
        created_at: ensureString(row.created_at),
        updated_at: ensureString(row.updated_at),
    }));
}

function parseClientAssignments(payload: unknown): ClientAssignment[] {
    return asArray<Record<string, unknown>>(payload).map((row) => ({
        ...row,
        id: ensureString(row.id),
        client_id: ensureString(row.client_id),
        base_profile_id: ensureString(row.base_profile_id),
        verification_type: ensureString(row.verification_type),
        target_statuses: asArray<string>(row.target_statuses),
        precedence: Number(row.precedence ?? 0),
        context_rules: (row.context_rules as Record<string, unknown>) ?? {},
        is_active: Boolean(row.is_active),
        created_at: ensureString(row.created_at),
        updated_at: ensureString(row.updated_at),
    }));
}

function parseClinicOverrides(payload: unknown): ClinicOverride[] {
    return asArray<Record<string, unknown>>(payload).map((row) => ({
        ...row,
        id: ensureString(row.id),
        clinic_id: ensureString(row.clinic_id),
        client_assignment_id: row.client_assignment_id ? ensureString(row.client_assignment_id) : null,
        override_base_profile_id: ensureString(row.override_base_profile_id),
        verification_type: ensureString(row.verification_type),
        target_statuses: asArray<string>(row.target_statuses),
        precedence: Number(row.precedence ?? 0),
        context_rules: (row.context_rules as Record<string, unknown>) ?? {},
        is_active: Boolean(row.is_active),
        created_at: ensureString(row.created_at),
        updated_at: ensureString(row.updated_at),
    }));
}

function parseResolveExplainResponse(payload: unknown): ResolveExplainResponse {
    const data = (payload as ResolveExplainResponse) ?? { winner: null, candidates: [], normalized_status: '' };
    return {
        ...data,
        winner: data?.winner ?? null,
        candidates: asArray(data?.candidates),
        normalized_status: ensureString(data?.normalized_status),
    };
}

export const useProfileResolutionStore = defineStore('profileResolution', () => {
    const baseProfiles = ref<BaseProfile[]>([]);
    const clientAssignments = ref<ClientAssignment[]>([]);
    const clinicOverrides = ref<ClinicOverride[]>([]);

    const loading = ref(false);
    const error = ref<string | null>(null);

    const loadingBaseProfiles = ref(false);
    const loadingClientAssignments = ref(false);
    const loadingClinicOverrides = ref(false);
    const loadingResolveExplain = ref(false);

    const simulatorInput = ref<ResolveExplainRequest>({
        client_id: '',
        clinic_id: '',
        verification_type: FIRST_VISIT_PRELOAD.verification_type,
        verification_status: FIRST_VISIT_PRELOAD.verification_status,
    });

    const lastExplainResponse = ref<ResolveExplainResponse | null>(null);
    const sessionHistory = ref<SimulatorHistoryEntry[]>([]);

    // ============================================
    // Editing State for Admin Workflow
    // ============================================
    const editingAssignment = ref<ClientAssignment | null>(null);
    const editingOverride = ref<ClinicOverride | null>(null);
    const isPanelOpen = ref(false);
    const editingMode = ref<EditingMode>('create');

    const hasSimulatorResult = computed(() => !!lastExplainResponse.value);

    function setError(err: unknown) {
        if (typeof err === 'string') {
            error.value = err;
            return;
        }
        if (err instanceof Error) {
            error.value = err.message;
            return;
        }
        error.value = 'Unexpected error while loading profile resolution data';
    }

    function clearError() {
        error.value = null;
    }

    function toNormalizedRequest(input: ResolveExplainRequest): ResolveExplainNormalizedRequest {
        return {
            ...input,
            verification_status_normalized: normalizeStatus(input.verification_status),
        };
    }

    function setSimulatorInput(next: Partial<ResolveExplainRequest>) {
        simulatorInput.value = {
            ...simulatorInput.value,
            ...next,
        };
    }

    function resetSimulatorInput() {
        simulatorInput.value = {
            client_id: '',
            clinic_id: '',
            verification_type: FIRST_VISIT_PRELOAD.verification_type,
            verification_status: FIRST_VISIT_PRELOAD.verification_status,
        };
    }

    function resetSimulatorSession() {
        lastExplainResponse.value = null;
        sessionHistory.value = [];
    }

    function preloadFirstVisit(params?: { clientId?: string; clinicId?: string }) {
        simulatorInput.value = {
            client_id: params?.clientId ?? '',
            clinic_id: params?.clinicId ?? '',
            verification_type: FIRST_VISIT_PRELOAD.verification_type,
            verification_status: FIRST_VISIT_PRELOAD.verification_status,
        };
    }

    async function fetchBaseProfiles() {
        loading.value = true;
        loadingBaseProfiles.value = true;
        clearError();
        try {
            const response = await fetchWrapper.get(`${apiUrl}/base-profiles`);
            baseProfiles.value = parseBaseProfiles(response);
            return baseProfiles.value;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loadingBaseProfiles.value = false;
            loading.value =
                loadingBaseProfiles.value ||
                loadingClientAssignments.value ||
                loadingClinicOverrides.value ||
                loadingResolveExplain.value;
        }
    }

    async function fetchClientAssignments(clientId: string) {
        loading.value = true;
        loadingClientAssignments.value = true;
        clearError();
        try {
            const response = await fetchWrapper.get(`${apiUrl}/clients/${clientId}/profile-assignments`);
            clientAssignments.value = parseClientAssignments(response);
            return clientAssignments.value;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loadingClientAssignments.value = false;
            loading.value =
                loadingBaseProfiles.value ||
                loadingClientAssignments.value ||
                loadingClinicOverrides.value ||
                loadingResolveExplain.value;
        }
    }

    async function fetchClinicOverrides(clinicId: string) {
        loading.value = true;
        loadingClinicOverrides.value = true;
        clearError();
        try {
            const response = await fetchWrapper.get(`${apiUrl}/clinics/${clinicId}/profile-overrides`);
            clinicOverrides.value = parseClinicOverrides(response);
            return clinicOverrides.value;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loadingClinicOverrides.value = false;
            loading.value =
                loadingBaseProfiles.value ||
                loadingClientAssignments.value ||
                loadingClinicOverrides.value ||
                loadingResolveExplain.value;
        }
    }

    function getDirectClinicOverrides(clinicId: string) {
        return clinicOverrides.value.filter((override) => override.clinic_id === clinicId);
    }

    function pushSimulatorHistory(
        request: ResolveExplainRequest,
        normalizedRequest: ResolveExplainNormalizedRequest,
        response: ResolveExplainResponse,
    ) {
        const entry: SimulatorHistoryEntry = {
            id: buildHistoryId(),
            created_at: new Date().toISOString(),
            request,
            normalized_request: normalizedRequest,
            response,
        };
        sessionHistory.value = [entry, ...sessionHistory.value];
        return entry;
    }

    async function resolveExplain(input?: ResolveExplainRequest) {
        loading.value = true;
        loadingResolveExplain.value = true;
        clearError();
        try {
            const rawRequest = input ?? simulatorInput.value;
            const normalized = toNormalizedRequest(rawRequest);

            const payload: ResolveExplainRequest = {
                client_id: normalized.client_id,
                clinic_id: normalized.clinic_id,
                verification_type: normalized.verification_type,
                verification_status: normalized.verification_status_normalized,
                has_shortform: normalized.has_shortform ?? false,
                context: normalized.context ?? {},
            };

            const response = await fetchWrapper.post(`${apiUrl}/pipeline/resolve-explain`, payload);
            const parsed = parseResolveExplainResponse(response);
            lastExplainResponse.value = parsed;
            pushSimulatorHistory({ ...rawRequest }, normalized, parsed);
            return parsed;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loadingResolveExplain.value = false;
            loading.value =
                loadingBaseProfiles.value ||
                loadingClientAssignments.value ||
                loadingClinicOverrides.value ||
                loadingResolveExplain.value;
        }
    }

    async function firstVisitPreloadAndFetch(params?: { clientId?: string; clinicId?: string }) {
        preloadFirstVisit(params);
        const requests: Array<Promise<unknown>> = [fetchBaseProfiles()];

        if (simulatorInput.value.client_id) {
            requests.push(fetchClientAssignments(simulatorInput.value.client_id));
        }

        if (simulatorInput.value.clinic_id) {
            requests.push(fetchClinicOverrides(simulatorInput.value.clinic_id));
        }

        await Promise.all(requests);
    }

    function replayHistory(entryId: string) {
        const entry = sessionHistory.value.find((historyEntry) => historyEntry.id === entryId);
        if (!entry) return;

        simulatorInput.value = { ...entry.request };
        lastExplainResponse.value = entry.response;
    }

    // ============================================
    // Editing Panel Mutations
    // ============================================

    function setEditingAssignment(assignment: ClientAssignment | null, mode: EditingMode = 'edit') {
        editingAssignment.value = assignment ? { ...assignment } : null;
        editingOverride.value = null;
        editingMode.value = mode;
        isPanelOpen.value = true;
    }

    function setEditingOverride(override: ClinicOverride | null, mode: EditingMode = 'edit') {
        editingOverride.value = override ? { ...override } : null;
        editingAssignment.value = null;
        editingMode.value = mode;
        isPanelOpen.value = true;
    }

    function closePanel() {
        isPanelOpen.value = false;
        editingAssignment.value = null;
        editingOverride.value = null;
        editingMode.value = 'create';
    }

    function markDirty() {
        // This is called when form data changes - handled in component
    }

    // ============================================
    // Client Assignment CRUD Actions
    // ============================================

    async function createAssignment(clientId: string, data: ClientAssignmentFormData): Promise<ClientAssignment> {
        loading.value = true;
        clearError();
        try {
            const response = await fetchWrapper.post(`${apiUrl}/clients/${clientId}/profile-assignments`, data);
            const newAssignment = parseClientAssignments([response])[0];
            clientAssignments.value = [...clientAssignments.value, newAssignment];
            return newAssignment;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateAssignment(assignmentId: string, data: Partial<ClientAssignmentFormData>): Promise<ClientAssignment> {
        loading.value = true;
        clearError();
        try {
            const response = await fetchWrapper.put(`${apiUrl}/profile-assignments/${assignmentId}`, data);
            const updatedAssignment = parseClientAssignments([response])[0];
            const idx = clientAssignments.value.findIndex((a) => a.id === assignmentId);
            if (idx !== -1) {
                clientAssignments.value[idx] = updatedAssignment;
            }
            return updatedAssignment;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function deactivateAssignment(assignmentId: string): Promise<void> {
        loading.value = true;
        clearError();
        try {
            await fetchWrapper.delete(`${apiUrl}/profile-assignments/${assignmentId}`);
            const idx = clientAssignments.value.findIndex((a) => a.id === assignmentId);
            if (idx !== -1) {
                clientAssignments.value[idx] = {
                    ...clientAssignments.value[idx],
                    is_active: false,
                };
            }
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ============================================
    // Clinic Override CRUD Actions
    // ============================================

    async function createOverride(clinicId: string, data: ClinicOverrideFormData): Promise<ClinicOverride> {
        loading.value = true;
        clearError();
        try {
            const response = await fetchWrapper.post(`${apiUrl}/clinics/${clinicId}/profile-overrides`, data);
            const newOverride = parseClinicOverrides([response])[0];
            clinicOverrides.value = [...clinicOverrides.value, newOverride];
            return newOverride;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateOverride(overrideId: string, data: Partial<ClinicOverrideFormData>): Promise<ClinicOverride> {
        loading.value = true;
        clearError();
        try {
            const response = await fetchWrapper.put(`${apiUrl}/profile-overrides/${overrideId}`, data);
            const updatedOverride = parseClinicOverrides([response])[0];
            const idx = clinicOverrides.value.findIndex((o) => o.id === overrideId);
            if (idx !== -1) {
                clinicOverrides.value[idx] = updatedOverride;
            }
            return updatedOverride;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function deactivateOverride(overrideId: string): Promise<void> {
        loading.value = true;
        clearError();
        try {
            await fetchWrapper.delete(`${apiUrl}/profile-overrides/${overrideId}`);
            const idx = clinicOverrides.value.findIndex((o) => o.id === overrideId);
            if (idx !== -1) {
                clinicOverrides.value[idx] = {
                    ...clinicOverrides.value[idx],
                    is_active: false,
                };
            }
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            loading.value = false;
        }
    }

    // ============================================
    // Base Profile Helpers
    // ============================================

    function getBaseProfilesByVerificationType(verificationType: string): BaseProfile[] {
        return baseProfiles.value.filter(
            (profile) => profile.verification_type === verificationType && profile.is_active,
        );
    }

    return {
        baseProfiles,
        clientAssignments,
        clinicOverrides,
        loading,
        error,
        loadingBaseProfiles,
        loadingClientAssignments,
        loadingClinicOverrides,
        loadingResolveExplain,
        simulatorInput,
        lastExplainResponse,
        sessionHistory,
        hasSimulatorResult,
        // Editing state
        editingAssignment,
        editingOverride,
        isPanelOpen,
        editingMode,
        // Editing mutations
        setEditingAssignment,
        setEditingOverride,
        closePanel,
        markDirty,
        // CRUD actions
        createAssignment,
        updateAssignment,
        deactivateAssignment,
        createOverride,
        updateOverride,
        deactivateOverride,
        // Helpers
        getBaseProfilesByVerificationType,
        // Read actions
        fetchBaseProfiles,
        fetchClientAssignments,
        fetchClinicOverrides,
        getDirectClinicOverrides,
        setSimulatorInput,
        resetSimulatorInput,
        resetSimulatorSession,
        preloadFirstVisit,
        firstVisitPreloadAndFetch,
        toNormalizedRequest,
        resolveExplain,
        replayHistory,
    };
});
