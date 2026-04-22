import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useClinicStore } from '@/stores/clinics';
import { useClientStore } from '@/stores/clients';
import type {
  AssignClinicsRequest,
  AssignClientsRequest,
  Encargado,
  EncargadoAnalytics,
  ExtractionManualTriggerRequest,
  ExtractionManualTriggerResponse,
  ExtractionRun,
  ExtractionRunFilters,
  ExtractionSchedule,
  Pagination,
  RunsResponse,
} from '@/types/extraction';

const baseUrl = `${import.meta.env.VITE_API_URL}/extractions`;
const apiUrl = `${import.meta.env.VITE_API_URL}`;

export const useExtractionStore = defineStore('extraction', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const runs = ref<ExtractionRun[]>([]);
  const selectedRun = ref<ExtractionRun | null>(null);
  const schedules = ref<ExtractionSchedule[]>([]);
  const encargados = ref<Encargado[]>([]);
  const encargadoAnalytics = ref<Record<string, EncargadoAnalytics>>({});

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
    } catch (err: any) {
      error.value = err?.message || String(err);
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
    } catch (err: any) {
      error.value = err?.message || String(err);
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
    } catch (err: any) {
      error.value = err?.message || String(err);
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
    } catch (err: any) {
      error.value = err?.message || String(err);
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
    } catch (err: any) {
      error.value = err?.message || String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEncargados() {
    loading.value = true;
    error.value = null;
    try {
      encargados.value = await fetchWrapper.get(`${apiUrl}/encargados`);
      return encargados.value;
    } catch (err: any) {
      error.value = err?.message || String(err);
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
      const created = await fetchWrapper.post(`${apiUrl}/encargados`, data) as Encargado;
      encargados.value.unshift(created);
      return created;
    } catch (err: any) {
      error.value = err?.message || String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateEncargado(id: string, data: Partial<Encargado>) {
    loading.value = true;
    error.value = null;
    try {
      const updated = await fetchWrapper.patch(`${apiUrl}/encargados/${id}`, data as Record<string, unknown>) as Encargado;
      const idx = encargados.value.findIndex((item) => item.id === id);
      if (idx !== -1) encargados.value[idx] = updated;
      return updated;
    } catch (err: any) {
      error.value = err?.message || String(err);
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
      const updated = await fetchWrapper.post(`${apiUrl}/encargados/${encargado_id}/clients`, payload) as Encargado;
      const idx = encargados.value.findIndex((item) => item.id === encargado_id);
      if (idx !== -1) encargados.value[idx] = updated;
      return updated;
    } catch (err: any) {
      error.value = err?.message || String(err);
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
      const updated = await fetchWrapper.post(`${apiUrl}/encargados/${encargado_id}/clinics`, payload) as Encargado;
      const idx = encargados.value.findIndex((item) => item.id === encargado_id);
      if (idx !== -1) encargados.value[idx] = updated;
      return updated;
    } catch (err: any) {
      error.value = err?.message || String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAnalytics(encargado_id: string) {
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchWrapper.get(`${apiUrl}/encargados/${encargado_id}/analytics`) as EncargadoAnalytics;
      encargadoAnalytics.value = {
        ...encargadoAnalytics.value,
        [encargado_id]: data,
      };
      return data;
    } catch (err: any) {
      error.value = err?.message || String(err);
      throw err;
    } finally {
      loading.value = false;
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

  return {
    loading,
    error,
    runs,
    selectedRun,
    schedules,
    encargados,
    encargadoAnalytics,
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
    assignClients,
    fetchAnalytics,
    statusColor,
  };
});
