import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useClinicStore } from '@/stores/clinics';
import { useClientStore } from '@/stores/clients';
import type {
  AssignClinicsResponse,
  AssignClinicsRequest,
  AssignClientsRequest,
  Encargado,
  EncargadoAssignmentChange,
  EncargadoAnalytics,
  EncargadoAnalyticsMetrics,
  EncargadoAnalyticsStatus,
  EncargadoCapacity,
  EncargadoClinicOwnership,
  EncargadoWorkloadSummary,
  ExtractionManualTriggerRequest,
  ExtractionManualTriggerResponse,
  ExtractionRun,
  ExtractionRunFilters,
  ExtractionSchedule,
  Pagination,
  RunsResponse,
  WorkforceDrawerMode,
} from '@/types/extraction';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

const baseUrl = `${import.meta.env.VITE_API_URL}/extractions`;
const apiUrl = `${import.meta.env.VITE_API_URL}`;

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeClinicOwnership(value: unknown): EncargadoClinicOwnership[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item): EncargadoClinicOwnership => ({
      clinic_id: typeof item.clinic_id === 'string' ? item.clinic_id : '',
      clinic_name: typeof item.clinic_name === 'string' ? item.clinic_name : '',
      client_id: typeof item.client_id === 'string' ? item.client_id : '',
      client_name: typeof item.client_name === 'string' ? item.client_name : '',
      assignment_source: item.assignment_source === 'client' ? 'client' : 'clinic'
    }))
    .filter((item) => item.clinic_id.length > 0);
}

function normalizeWorkloadSummary(value: unknown, member: Pick<Encargado, 'resolved_assignment_client_ids' | 'resolved_assignment_clinic_ids' | 'clinic_ids' | 'client_ids'>): EncargadoWorkloadSummary {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    resolved_client_count: typeof payload.resolved_client_count === 'number' ? payload.resolved_client_count : member.resolved_assignment_client_ids?.length ?? 0,
    resolved_clinic_count: typeof payload.resolved_clinic_count === 'number' ? payload.resolved_clinic_count : member.resolved_assignment_clinic_ids?.length ?? 0,
    direct_clinic_count: typeof payload.direct_clinic_count === 'number' ? payload.direct_clinic_count : member.clinic_ids.length,
    legacy_client_count: typeof payload.legacy_client_count === 'number' ? payload.legacy_client_count : member.client_ids.length
  };
}

function normalizeCapacity(value: unknown, clinicIds: string[]): EncargadoCapacity {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    status: typeof payload.status === 'string' ? payload.status as EncargadoCapacity['status'] : 'unavailable',
    max_clinics: typeof payload.max_clinics === 'number' ? payload.max_clinics : null,
    assigned_clinic_count: typeof payload.assigned_clinic_count === 'number' ? payload.assigned_clinic_count : clinicIds.length,
    available_clinic_slots: typeof payload.available_clinic_slots === 'number' ? payload.available_clinic_slots : null,
    utilization_ratio: typeof payload.utilization_ratio === 'number' ? payload.utilization_ratio : null
  };
}

function normalizeAnalyticsStatus(value: unknown): EncargadoAnalyticsStatus {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    state: typeof payload.state === 'string' ? payload.state as EncargadoAnalyticsStatus['state'] : 'pending',
    missing_metrics: normalizeStringArray(payload.missing_metrics),
    updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : null
  };
}

function normalizeEncargado(raw: Encargado): Encargado {
  const analyticsStatus = normalizeAnalyticsStatus(raw.analytics_status);
  const normalized: Encargado = {
    ...raw,
    clinic_ids: normalizeStringArray(raw.clinic_ids),
    client_ids: normalizeStringArray(raw.client_ids),
    resolved_assignment_client_ids: normalizeStringArray(raw.resolved_assignment_client_ids),
    resolved_assignment_clinic_ids: normalizeStringArray(raw.resolved_assignment_clinic_ids),
    resolved_clinic_ownership: [],
    workload_summary: {
      resolved_client_count: 0,
      resolved_clinic_count: 0,
      direct_clinic_count: 0,
      legacy_client_count: 0
    },
    capacity: {
      status: 'unavailable',
      max_clinics: null,
      assigned_clinic_count: 0,
      available_clinic_slots: null,
      utilization_ratio: null
    },
    analytics_status: analyticsStatus
  };

  normalized.resolved_clinic_ownership = normalizeClinicOwnership(raw.resolved_clinic_ownership);
  normalized.workload_summary = normalizeWorkloadSummary(raw.workload_summary, normalized);
  normalized.capacity = normalizeCapacity(raw.capacity, normalized.clinic_ids);
  if (!analyticsStatus.missing_metrics.length) {
    analyticsStatus.missing_metrics = ['verification_volume', 'completion_rate'];
  }

  return normalized;
}

function normalizeEncargadoAnalytics(raw: EncargadoAnalytics): EncargadoAnalytics {
  const resolved_assignment_client_ids = normalizeStringArray(raw.resolved_assignment_client_ids);
  const resolved_assignment_clinic_ids = normalizeStringArray(raw.resolved_assignment_clinic_ids);
  const metricsPayload: Partial<EncargadoAnalyticsMetrics> = isRecord(raw.metrics)
    ? raw.metrics as EncargadoAnalyticsMetrics
    : {};
  const analyticsStatus = normalizeAnalyticsStatus(raw.analytics_status);

  const normalized: EncargadoAnalytics = {
    ...raw,
    resolved_assignment_client_ids,
    resolved_assignment_clinic_ids,
    resolved_clinic_ownership: normalizeClinicOwnership(raw.resolved_clinic_ownership),
    workload_summary: {
      resolved_client_count: 0,
      resolved_clinic_count: 0,
      direct_clinic_count: 0,
      legacy_client_count: 0
    },
    capacity: {
      status: 'unavailable',
      max_clinics: null,
      assigned_clinic_count: 0,
      available_clinic_slots: null,
      utilization_ratio: null
    },
    analytics_status: analyticsStatus,
    metrics: {
      client_count: typeof metricsPayload.client_count === 'number' ? metricsPayload.client_count : resolved_assignment_client_ids.length,
      clinic_count: typeof metricsPayload.clinic_count === 'number' ? metricsPayload.clinic_count : resolved_assignment_clinic_ids.length,
      verification_volume: typeof metricsPayload.verification_volume === 'number' ? metricsPayload.verification_volume : null,
      completion_rate: typeof metricsPayload.completion_rate === 'number' ? metricsPayload.completion_rate : null
    }
  };

  normalized.workload_summary = normalizeWorkloadSummary(raw.workload_summary, {
    resolved_assignment_client_ids,
    resolved_assignment_clinic_ids,
    clinic_ids: [],
    client_ids: []
  });
  normalized.capacity = normalizeCapacity(raw.capacity, []);
  if (!analyticsStatus.missing_metrics.length) {
    analyticsStatus.missing_metrics = ['verification_volume', 'completion_rate'];
  }

  return normalized;
}

function cloneEncargado(member: Encargado): Encargado {
  return JSON.parse(JSON.stringify(member)) as Encargado;
}

function cloneAnalytics(analytics: EncargadoAnalytics | undefined): EncargadoAnalytics | undefined {
  return analytics ? (JSON.parse(JSON.stringify(analytics)) as EncargadoAnalytics) : undefined;
}

function normalizeAssignClinicsResponse(raw: Encargado | AssignClinicsResponse): AssignClinicsResponse {
  if ('member' in raw && 'rollback_member' in raw && 'assignment_change' in raw) {
    return {
      member: normalizeEncargado(raw.member),
      rollback_member: normalizeEncargado(raw.rollback_member),
      assignment_change: raw.assignment_change,
    };
  }

  const normalizedMember = normalizeEncargado(raw);
  const legacyChange: EncargadoAssignmentChange = {
    encargado_id: normalizedMember.id,
    changed: true,
    requested_clinic_ids: normalizedMember.clinic_ids,
    previous_clinic_ids: [],
    added_clinic_ids: normalizedMember.clinic_ids,
    removed_clinic_ids: [],
    affected_analytics_fields: ['resolved_assignment_clinic_ids', 'resolved_clinic_ownership', 'workload_summary', 'capacity', 'analytics_status', 'metrics']
  };
  return {
    member: normalizedMember,
    rollback_member: normalizedMember,
    assignment_change: legacyChange
  };
}

export const useExtractionStore = defineStore('extraction', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const runs = ref<ExtractionRun[]>([]);
  const selectedRun = ref<ExtractionRun | null>(null);
  const schedules = ref<ExtractionSchedule[]>([]);
  const encargados = ref<Encargado[]>([]);
  const encargadoAnalytics = ref<Record<string, EncargadoAnalytics>>({});
  const selectedEncargadoId = ref<string | null>(null);
  const drawerOpen = ref(false);
  const drawerMode = ref<WorkforceDrawerMode>('closed');
  const analyticsLoadingById = ref<Record<string, boolean>>({});
  const reassignmentPendingById = ref<Record<string, boolean>>({});

  const runsPagination = ref<Pagination>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });

  const runFilters = ref<ExtractionRunFilters>({
    page: 1,
    per_page: 20,
    status: '',
    run_type: '',
    clinic_ids: [],
  });

  const recentRuns = computed(() => runs.value.slice(0, 10));
  const selectedEncargado = computed<Encargado | null>(() => {
    if (!selectedEncargadoId.value) return null;
    return encargados.value.find((item) => item.id === selectedEncargadoId.value) ?? null;
  });

  const dashboardSummary = computed(() => {
    const total = runs.value.length;
    const completed = runs.value.filter((run) => run.status === 'COMPLETED').length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalRuns = runs.value.length;
    const appointmentsToday = runs.value.reduce((sum, run) => sum + (run.inserted_rows_count || 0), 0);
    const activeSchedules = schedules.value.filter((schedule) => schedule.auto_extract_enabled).length;

    return {
      total_runs: totalRuns,
      success_rate: successRate,
      active_schedules: activeSchedules,
      appointments_today: appointmentsToday,
    };
  });

  const clinicNameMap = computed<Record<string, string>>(() => {
    const clinicStore = useClinicStore();
    return (clinicStore.clinics || []).reduce((acc, clinic) => {
      acc[clinic.id] = clinic.clinic_name;
      return acc;
    }, {} as Record<string, string>);
  });

  function ensureDateRange(dateFrom?: string, dateTo?: string) {
    if (!dateFrom || !dateTo) return;
    if (new Date(dateTo) < new Date(dateFrom)) {
      throw new Error('Invalid date range: date_to cannot be before date_from');
    }
  }

  function applyRunFilters(items: ExtractionRun[], filters: ExtractionRunFilters): ExtractionRun[] {
    let filtered = [...items];

    if (filters.clinic_ids && filters.clinic_ids.length > 0) {
      const allowed = new Set(filters.clinic_ids);
      filtered = filtered.filter((item) => allowed.has(item.clinic_id));
    }

    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    if (filters.run_type) {
      filtered = filtered.filter((item) => item.run_type === filters.run_type);
    }

    if (filters.date_from) {
      const from = new Date(filters.date_from);
      filtered = filtered.filter((item) => new Date(item.target_date) >= from);
    }

    if (filters.date_to) {
      const to = new Date(filters.date_to);
      filtered = filtered.filter((item) => new Date(item.target_date) <= to);
    }

    return filtered;
  }

  async function hydrateLookups() {
    const clinicStore = useClinicStore();
    const clientStore = useClientStore();

    await Promise.all([
      clinicStore.fetchClinicCatalog({ limit: 500, includeInactive: true }),
      clientStore.fetchClients({ limit: 500, includeInactive: true }),
    ]);
  }

  async function fetchRuns(params: ExtractionRunFilters = {}) {
    loading.value = true;
    error.value = null;

    try {
      const merged = {
        ...runFilters.value,
        ...params,
      };

      ensureDateRange(merged.date_from, merged.date_to);

      const page = merged.page ?? 1;
      const perPage = merged.per_page ?? 20;
      const requestLimit = Math.min(Math.max(page * perPage, 50), 500);

      const query = new URLSearchParams();
      if (merged.clinic_ids && merged.clinic_ids.length === 1) {
        query.set('clinic_id', merged.clinic_ids[0]);
      }
      if (merged.status) query.set('status', merged.status);
      query.set('limit', String(requestLimit));

      const url = query.toString() ? `${baseUrl}/runs?${query.toString()}` : `${baseUrl}/runs`;
      const payload = await fetchWrapper.get(url) as RunsResponse | ExtractionRun[];
      const allRuns = Array.isArray(payload) ? payload : (payload.runs ?? []);

      const filtered = applyRunFilters(allRuns, merged);
      const start = (page - 1) * perPage;
      const end = start + perPage;

      runs.value = filtered.slice(start, end);
      runFilters.value = merged;
      runsPagination.value = {
        page,
        per_page: perPage,
        total: filtered.length,
        pages: Math.ceil(filtered.length / perPage),
      };

      return runs.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch extraction runs');
      runs.value = [];
      runsPagination.value = { page: 1, per_page: 20, total: 0, pages: 0 };
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRunDetail(id: string) {
    loading.value = true;
    error.value = null;
    try {
      selectedRun.value = await fetchWrapper.get(`${baseUrl}/runs/${id}`);
      return selectedRun.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch extraction run detail');
      selectedRun.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function triggerExtraction(
    clinic_id: string,
    run_type: 'NEW_DATE' | 'REVIEW',
    date_from: string,
    date_to: string,
  ) {
    loading.value = true;
    error.value = null;
    try {
      ensureDateRange(date_from, date_to);
      const payload: ExtractionManualTriggerRequest = { clinic_id, run_type, date_from, date_to };
      const result = await fetchWrapper.post(baseUrl, payload) as ExtractionManualTriggerResponse;
      await fetchRuns({ page: 1, per_page: runFilters.value.per_page ?? 20 });
      return result;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to trigger extraction');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSchedules(client_id?: string) {
    loading.value = true;
    error.value = null;
    try {
      const query = new URLSearchParams();
      if (client_id) query.set('client_id', client_id);
      const url = query.toString() ? `${baseUrl}/schedules?${query.toString()}` : `${baseUrl}/schedules`;
      schedules.value = await fetchWrapper.get(url);
      return schedules.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch extraction schedules');
      schedules.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function updateSchedule(id: string, data: Partial<ExtractionSchedule>) {
    loading.value = true;
    error.value = null;
    try {
      const updated = await fetchWrapper.patch(`${baseUrl}/schedules/${id}`, data as Record<string, unknown>) as ExtractionSchedule;
      const idx = schedules.value.findIndex((item) => item.id === id);
      if (idx !== -1) schedules.value[idx] = updated;
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to update extraction schedule');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEncargados() {
    loading.value = true;
    error.value = null;
    try {
      const payload = await fetchWrapper.get(`${apiUrl}/encargados`) as Encargado[];
      encargados.value = payload.map(normalizeEncargado);
      if (selectedEncargadoId.value) {
        const stillSelected = encargados.value.some((item) => item.id === selectedEncargadoId.value);
        if (!stillSelected && drawerMode.value !== 'create') {
          selectedEncargadoId.value = null;
          drawerOpen.value = false;
          drawerMode.value = 'closed';
        }
      }
      return encargados.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch team members');
      encargados.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function createEncargado(data: { name: string; email: string; is_active?: boolean }) {
    loading.value = true;
    error.value = null;
    try {
      const created = normalizeEncargado(await fetchWrapper.post(`${apiUrl}/encargados`, data) as Encargado);
      encargados.value.unshift(created);
      return created;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to create team member');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateEncargado(id: string, data: Partial<Encargado>) {
    loading.value = true;
    error.value = null;
    try {
      const updated = normalizeEncargado(await fetchWrapper.patch(`${apiUrl}/encargados/${id}`, data as Record<string, unknown>) as Encargado);
      const idx = encargados.value.findIndex((item) => item.id === id);
      if (idx !== -1) encargados.value[idx] = updated;
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to update team member');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function assignClients(encargado_id: string, client_ids: string[]) {
    loading.value = true;
    error.value = null;
    try {
      const payload: AssignClientsRequest = { client_ids };
      const updated = normalizeEncargado(await fetchWrapper.post(`${apiUrl}/encargados/${encargado_id}/clients`, payload) as Encargado);
      const idx = encargados.value.findIndex((item) => item.id === encargado_id);
      if (idx !== -1) encargados.value[idx] = updated;
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to assign fallback clients');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function assignClinics(encargado_id: string, clinic_ids: string[]) {
    loading.value = true;
    error.value = null;
    try {
      const payload: AssignClinicsRequest = { clinic_ids };
      const response = normalizeAssignClinicsResponse(await fetchWrapper.post(`${apiUrl}/encargados/${encargado_id}/clinics`, payload) as Encargado | AssignClinicsResponse);
      const updated = response.member;
      const idx = encargados.value.findIndex((item) => item.id === encargado_id);
      if (idx !== -1) encargados.value[idx] = updated;
      if (response.assignment_change.changed) {
        const cache = { ...encargadoAnalytics.value };
        delete cache[encargado_id];
        encargadoAnalytics.value = cache;
      }
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to assign clinics');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAnalytics(encargado_id: string) {
    error.value = null;
    try {
      const data = normalizeEncargadoAnalytics(await fetchWrapper.get(`${apiUrl}/encargados/${encargado_id}/analytics`) as EncargadoAnalytics);
      encargadoAnalytics.value = {
        ...encargadoAnalytics.value,
        [encargado_id]: data,
      };
      return data;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch workforce analytics');
      throw err;
    }
  }

  function statusColor(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'success',
      RUNNING: 'info',
      FAILED: 'error',
      PENDING: 'warning',
      SKIPPED: 'grey',
    };
    return map[status] ?? 'grey';
  }

  async function ensureWorkforceAnalytics(encargado_id: string, force = false) {
    if (!encargado_id) return null;
    if (!force && encargadoAnalytics.value[encargado_id]) {
      return encargadoAnalytics.value[encargado_id];
    }
    if (analyticsLoadingById.value[encargado_id]) {
      return encargadoAnalytics.value[encargado_id] ?? null;
    }

    analyticsLoadingById.value = {
      ...analyticsLoadingById.value,
      [encargado_id]: true,
    };
    try {
      return await fetchAnalytics(encargado_id);
    } finally {
      analyticsLoadingById.value = {
        ...analyticsLoadingById.value,
        [encargado_id]: false,
      };
    }
  }

  async function openWorkforceMember(encargado_id: string, mode: WorkforceDrawerMode = 'detail') {
    selectedEncargadoId.value = encargado_id;
    drawerMode.value = mode;
    drawerOpen.value = true;
    await ensureWorkforceAnalytics(encargado_id);
  }

  function openCreateDrawer() {
    selectedEncargadoId.value = null;
    drawerMode.value = 'create';
    drawerOpen.value = true;
  }

  function closeWorkforceDrawer() {
    drawerOpen.value = false;
    selectedEncargadoId.value = null;
    drawerMode.value = 'closed';
  }

  function setDrawerMode(mode: WorkforceDrawerMode) {
    drawerMode.value = mode;
    if (mode === 'closed') {
      drawerOpen.value = false;
      selectedEncargadoId.value = null;
    } else {
      drawerOpen.value = true;
    }
  }

  function invalidateAnalytics(encargado_id: string) {
    const cache = { ...encargadoAnalytics.value };
    delete cache[encargado_id];
    encargadoAnalytics.value = cache;
  }

  function buildOptimisticMember(previous: Encargado, clinic_ids: string[]): Encargado {
    const nextClinicIds = [...clinic_ids];
    const nextScope = nextClinicIds.length > 0
      ? 'clinic'
      : (previous.client_ids.length > 0 ? 'client' : 'unassigned');

    return {
      ...cloneEncargado(previous),
      clinic_ids: nextClinicIds,
      resolved_assignment_scope: nextScope,
      resolved_assignment_clinic_ids: nextScope === 'clinic' ? nextClinicIds : [],
      workload_summary: {
        resolved_client_count: nextScope === 'clinic'
          ? previous.resolved_assignment_client_ids?.length ?? previous.client_ids.length
          : previous.client_ids.length,
        resolved_clinic_count: nextScope === 'clinic' ? nextClinicIds.length : previous.resolved_assignment_clinic_ids?.length ?? 0,
        direct_clinic_count: nextClinicIds.length,
        legacy_client_count: previous.client_ids.length,
      },
      capacity: {
        status: previous.capacity?.status ?? 'unavailable',
        max_clinics: previous.capacity?.max_clinics ?? null,
        assigned_clinic_count: nextClinicIds.length,
        available_clinic_slots: previous.capacity?.max_clinics != null
          ? previous.capacity.max_clinics - nextClinicIds.length
          : null,
        utilization_ratio: previous.capacity?.max_clinics
          ? Number((nextClinicIds.length / previous.capacity.max_clinics).toFixed(2))
          : null,
      },
      analytics_status: {
        state: 'pending',
        missing_metrics: ['verification_volume', 'completion_rate'],
        updated_at: null,
      },
      resolved_clinic_ownership: [],
    };
  }

  async function assignClinicsOptimistic(encargado_id: string, clinic_ids: string[]) {
    const idx = encargados.value.findIndex((item) => item.id === encargado_id);
    if (idx === -1) {
      throw new Error(`Encargado '${encargado_id}' not found in store cache`);
    }

    const previousMember = cloneEncargado(encargados.value[idx]);
    const previousAnalytics = cloneAnalytics(encargadoAnalytics.value[encargado_id]);

    reassignmentPendingById.value = {
      ...reassignmentPendingById.value,
      [encargado_id]: true,
    };

    encargados.value[idx] = buildOptimisticMember(previousMember, clinic_ids);
    invalidateAnalytics(encargado_id);

    try {
      const payload: AssignClinicsRequest = { clinic_ids };
      const response = normalizeAssignClinicsResponse(
        await fetchWrapper.post(`${apiUrl}/encargados/${encargado_id}/clinics`, payload) as Encargado | AssignClinicsResponse
      );
      encargados.value[idx] = response.member;
      if (response.assignment_change.changed) {
        invalidateAnalytics(encargado_id);
      }
      if (drawerOpen.value && selectedEncargadoId.value === encargado_id) {
        await ensureWorkforceAnalytics(encargado_id, true);
      }
      return response;
    } catch (err) {
      encargados.value[idx] = previousMember;
      if (previousAnalytics) {
        encargadoAnalytics.value = {
          ...encargadoAnalytics.value,
          [encargado_id]: previousAnalytics,
        };
      }
      throw err;
    } finally {
      reassignmentPendingById.value = {
        ...reassignmentPendingById.value,
        [encargado_id]: false,
      };
    }
  }

  return {
    loading,
    error,
    runs,
    selectedRun,
    schedules,
    encargados,
    encargadoAnalytics,
    selectedEncargadoId,
    selectedEncargado,
    drawerOpen,
    drawerMode,
    analyticsLoadingById,
    reassignmentPendingById,
    runFilters,
    runsPagination,
    recentRuns,
    dashboardSummary,
    clinicNameMap,
    hydrateLookups,
    fetchRuns,
    fetchRunDetail,
    triggerExtraction,
    fetchSchedules,
    updateSchedule,
    fetchEncargados,
    createEncargado,
    updateEncargado,
    assignClinics,
    assignClinicsOptimistic,
    assignClients,
    fetchAnalytics,
    ensureWorkforceAnalytics,
    openWorkforceMember,
    openCreateDrawer,
    closeWorkforceDrawer,
    setDrawerMode,
    invalidateAnalytics,
    statusColor,
  };
});
