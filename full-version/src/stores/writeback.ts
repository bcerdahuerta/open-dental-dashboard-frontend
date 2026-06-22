import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import type {
    WritebackJob,
    WritebackJobDetail,
    QueueStats,
    JobsPagination,
    SyncClinicRequest,
    SyncClinicResult,
    PreviewReadyRow,
    WritebackConfigResponse,
} from '@/types/writeback';

const baseUrl = `${import.meta.env.VITE_API_URL}/writeback`;

export const useWritebackStore = defineStore('writeback', () => {
    // State
    const queueStats = ref<QueueStats>({
        PENDING: 0,
        POLLING: 0,
        EXTRACTING: 0,
        EXECUTING: 0,
        DONE: 0,
        FAILED: 0,
        EXTRACTED: 0,
        EXECUTED: 0,
        PARTIAL: 0,
        NO_APPOINTMENT: 0,
        RETRY_DEFERRED: 0,
        BLOCKED_ECONNECTOR: 0,
        SHEETS_RETRYING: 0,
        SYNCING: 0,
        SYNCED: 0,
        EXTRACT_FAILED: 0,
        SYNC_FAILED: 0,
        total: 0,
    });
    const jobs = ref<WritebackJob[]>([]);
    const selectedJob = ref<WritebackJobDetail | null>(null);
    const loading = ref(false);
    const detailLoading = ref(false);
    const error = ref<string | null>(null);
    const jobsPagination = ref<JobsPagination>({
        page: 1,
        per_page: 50,
        total: 0,
        pages: 0,
    });
    // Per-clinic stats for traffic light indicators
    const clinicStatsMap = ref<Record<string, QueueStats>>({});

    // Actions
    async function fetchQueueStats() {
        try {
            const data = await fetchWrapper.get(`${baseUrl}/queue/stats`);
            queueStats.value = data;
        } catch (err: any) {
            error.value = err;
        }
    }

    async function fetchClinicStats(clinicId: string) {
        try {
            const data = await fetchWrapper.get(`${baseUrl}/queue/stats?clinic_id=${clinicId}`);
            clinicStatsMap.value[clinicId] = data;
        } catch (err: any) {
            // Silently fail per-clinic stats — non-critical
        }
    }

    async function fetchJobs(filters: {
        page?: number;
        per_page?: number;
        client_id?: string;
        clinic_id?: string;
        status?: string;
    } = {}) {
        loading.value = true;
        error.value = null;
        try {
            const params = new URLSearchParams();
            if (filters.page) params.set('page', String(filters.page));
            if (filters.per_page) params.set('per_page', String(filters.per_page));
            if (filters.client_id) params.set('client_id', filters.client_id);
            if (filters.clinic_id) params.set('clinic_id', filters.clinic_id);
            if (filters.status) params.set('status', filters.status);

            const qs = params.toString();
            const url = qs ? `${baseUrl}/jobs?${qs}` : `${baseUrl}/jobs`;
            const data = await fetchWrapper.get(url);

            jobs.value = data.items;
            jobsPagination.value = {
                page: data.page,
                per_page: data.per_page,
                total: data.total,
                pages: data.pages,
            };
        } catch (err: any) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    }

    async function fetchJobDetail(jobId: string) {
        detailLoading.value = true;
        error.value = null;
        try {
            selectedJob.value = await fetchWrapper.get(`${baseUrl}/jobs/${jobId}`);
        } catch (err: any) {
            error.value = err;
        } finally {
            detailLoading.value = false;
        }
    }

    async function retryJob(jobId: string) {
        try {
            await fetchWrapper.post(`${baseUrl}/jobs/${jobId}/retry`);
            // Refresh the job list and stats
            await Promise.all([fetchJobs(), fetchQueueStats()]);
        } catch (err: any) {
            error.value = err;
            throw err;
        }
    }

    async function syncClinic(clinicId: string, payload?: SyncClinicRequest): Promise<SyncClinicResult> {
        try {
            const result = await fetchWrapper.post(`${baseUrl}/sync/${clinicId}`, payload);
            // Refresh stats after sync
            await fetchQueueStats();
            return result;
        } catch (err: any) {
            error.value = err;
            throw err;
        }
    }

    async function previewReadyRows(clinicId: string): Promise<PreviewReadyRow[]> {
        try {
            return await fetchWrapper.get(`${baseUrl}/preview/${clinicId}`);
        } catch (err: any) {
            return [];
        }
    }

    async function fetchWritebackConfig(clinicId: string): Promise<WritebackConfigResponse> {
        try {
            return await fetchWrapper.get(`${baseUrl}/config/${clinicId}`);
        } catch (err: any) {
            return {
                writeback_mode: 'manual',
                quiet_start: null,
                quiet_end: null,
                timezone: 'America/Chicago',
                audit_column: 'Update Status',
                upload_column: 'Upload Status',
                upload_done_value: 'Done By DR',
                include_not_found: false,
                watch_health: {
                    status: 'none',
                    expires_at: null,
                    automatic_healthy: false,
                },
            };
        }
    }

    async function saveWritebackConfig(clinicId: string, data: {
        writeback_mode: string;
        quiet_start?: string | null;
        quiet_end?: string | null;
        timezone?: string;
        audit_column?: string;
        upload_column?: string;
        upload_done_value?: string;
        include_not_found?: boolean;
    }) {
        try {
            return await fetchWrapper.put(`${baseUrl}/config/${clinicId}`, data);
        } catch (err: any) {
            error.value = err;
            throw err;
        }
    }

    async function executeJob(jobId: string) {
        try {
            const result = await fetchWrapper.post(`${baseUrl}/jobs/${jobId}/execute`);
            // Refresh job list and stats
            await Promise.all([fetchJobs(), fetchQueueStats()]);
            return result;
        } catch (err: any) {
            error.value = err;
            throw err;
        }
    }

    // Circuit Breaker
    const circuitBreakerStatuses = ref<Record<string, { state: string; failures: number; seconds_until_reset: number }>>({});

    async function fetchCircuitBreakerStatus() {
        try {
            const data = await fetchWrapper.get(`${baseUrl}/circuit-breaker`);
            const statuses = data as Array<{ clinic_id: string; state: string; failures: number; seconds_until_reset: number }>;
            const map: Record<string, { state: string; failures: number; seconds_until_reset: number }> = {};
            for (const s of statuses) {
                map[s.clinic_id] = s;
            }
            circuitBreakerStatuses.value = map;
        } catch (err: any) {
            error.value = err;
        }
    }

    // Compensation entries
    const compensationEntries = ref<any[]>([]);

    async function fetchCompensationEntries(executionId: string) {
        try {
            const apiUrl = `${import.meta.env.VITE_API_URL}/compensation`;
            const data = await fetchWrapper.get(`${apiUrl}?execution_id=${executionId}`);
            compensationEntries.value = data as any[];
            return data;
        } catch (err: any) {
            error.value = err;
            compensationEntries.value = [];
        }
    }

    return {
        queueStats,
        jobs,
        selectedJob,
        loading,
        detailLoading,
        error,
        jobsPagination,
        clinicStatsMap,
        circuitBreakerStatuses,
        compensationEntries,
        fetchQueueStats,
        fetchClinicStats,
        fetchJobs,
        fetchJobDetail,
        retryJob,
        syncClinic,
        previewReadyRows,
        fetchWritebackConfig,
        saveWritebackConfig,
        executeJob,
        fetchCircuitBreakerStatus,
        fetchCompensationEntries,
    };
});
