import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import type {
  CreditSummary,
  CreditRun,
  CreditRecord,
  CreditException,
  CreditFilters,
  CreditRunFilters,
  Pagination,
} from '@/types/credit';

const baseUrl = `${import.meta.env.VITE_API_URL}/credit`;

export const useCreditStore = defineStore('credit', () => {
  // State
  const summary = ref<CreditSummary[]>([]);
  const runs = ref<CreditRun[]>([]);
  const records = ref<CreditRecord[]>([]);
  const selectedRecord = ref<CreditRecord | null>(null);
  const exceptions = ref<CreditException[]>([]);
  const creditClinics = ref<{ id: string; clinic_name: string }[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const runsPagination = ref<Pagination>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });

  const recordsPagination = ref<Pagination>({
    page: 1,
    per_page: 50,
    total: 0,
    pages: 0,
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function fetchSummary(clinicId?: string) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (clinicId) params.set('clinic_id', clinicId);
      const qs = params.toString();
      const url = qs ? `${baseUrl}/summary?${qs}` : `${baseUrl}/summary`;
      const data = await fetchWrapper.get(url);
      summary.value = data.summary ?? [];
    } catch (err: any) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRuns(filters: CreditRunFilters = {}) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.per_page) params.set('per_page', String(filters.per_page));
      if (filters.clinic_id) params.set('clinic_id', filters.clinic_id);
      if (filters.status) params.set('status', filters.status);

      const qs = params.toString();
      const url = qs ? `${baseUrl}/runs?${qs}` : `${baseUrl}/runs`;
      const data = await fetchWrapper.get(url);

      runs.value = data.runs ?? [];
      runsPagination.value = {
        page: data.page,
        per_page: filters.per_page ?? 20,
        total: data.total,
        pages: data.pages,
      };
    } catch (err: any) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRun(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchWrapper.get(`${baseUrl}/runs/${id}`);
      return data as CreditRun;
    } catch (err: any) {
      error.value = err;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRecords(filters: CreditFilters = {}) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.per_page) params.set('per_page', String(filters.per_page));
      if (filters.clinic_id) params.set('clinic_id', filters.clinic_id);
      if (filters.run_id) params.set('run_id', filters.run_id);
      if (filters.credit_type) params.set('credit_type', filters.credit_type);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.excluded) params.set('excluded', filters.excluded);
      if (filters.sort) params.set('sort', filters.sort);

      const qs = params.toString();
      const url = qs ? `${baseUrl}/records?${qs}` : `${baseUrl}/records`;
      const data = await fetchWrapper.get(url);

      records.value = data.records ?? [];
      recordsPagination.value = {
        page: data.page,
        per_page: filters.per_page ?? 50,
        total: data.total,
        pages: data.pages,
      };
    } catch (err: any) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRecord(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchWrapper.get(`${baseUrl}/records/${id}`);
      selectedRecord.value = data as CreditRecord;
      return data as CreditRecord;
    } catch (err: any) {
      error.value = err;
      selectedRecord.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchExceptions(filters: { run_id?: string; flag_type?: string; severity?: string } = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.run_id) params.set('run_id', filters.run_id);
      if (filters.flag_type) params.set('flag_type', filters.flag_type);
      if (filters.severity) params.set('severity', filters.severity);
      const qs = params.toString();
      const url = qs ? `${baseUrl}/exceptions?${qs}` : `${baseUrl}/exceptions`;
      const data = await fetchWrapper.get(url);
      exceptions.value = data.exceptions ?? [];
    } catch (err: any) {
      error.value = err;
    }
  }

  async function triggerRun(clinicIds?: string[]) {
    try {
      const body = clinicIds ? { clinic_ids: clinicIds } : undefined;
      const result = await fetchWrapper.post(`${baseUrl}/runs/trigger`, body);
      // Refresh runs and summary after trigger
      await Promise.all([fetchRuns(), fetchSummary()]);
      return result;
    } catch (err: any) {
      error.value = err;
      throw err;
    }
  }

  async function exportCsv(runId: string) {
    try {
      // Use native fetch for blob download (fetchWrapper parses JSON)
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      const response = await fetch(`${baseUrl}/export/${runId}`, {
        headers: {
          Authorization: `Bearer ${authStore.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      const filename = disposition?.match(/filename="?(.+?)"?$/)?.[1] ?? `credit_report_${runId}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      error.value = err;
      throw err;
    }
  }

  async function fetchCreditClinics() {
    try {
      creditClinics.value = await fetchWrapper.get(`${baseUrl}/clinics`);
      return creditClinics.value;
    } catch (err: any) {
      error.value = err;
      creditClinics.value = [];
      return [];
    }
  }

  return {
    // State
    summary,
    runs,
    records,
    selectedRecord,
    exceptions,
    creditClinics,
    loading,
    error,
    runsPagination,
    recordsPagination,
    // Actions
    fetchSummary,
    fetchRuns,
    fetchRun,
    fetchRecords,
    fetchRecord,
    fetchExceptions,
    triggerRun,
    exportCsv,
    fetchCreditClinics,
  };
});
