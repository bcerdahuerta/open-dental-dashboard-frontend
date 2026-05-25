import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import type { RobotWorkstation } from '@/types/robot';

const baseUrl = `${import.meta.env.VITE_API_URL}/robots`;

function normalizeWorkstation(raw: RobotWorkstation): RobotWorkstation {
  return {
    ...raw,
    alerted_at: raw.alerted_at ?? null,
    last_recovered_at: raw.last_recovered_at ?? null
  };
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err || 'Unable to load robot workstations.');
}

export const useRobotStore = defineStore('robot', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const workstations = ref<RobotWorkstation[]>([]);

  const healthyCount = computed(() => workstations.value.filter((item) => item.status === 'HEALTHY').length);
  const staleCount = computed(() => workstations.value.filter((item) => item.status === 'STALE').length);
  const totalCount = computed(() => workstations.value.length);
  const lastAlertAt = computed(() => {
    const timestamps = workstations.value
      .map((item) => item.alerted_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return timestamps[0] ?? null;
  });

  async function fetchWorkstations() {
    loading.value = true;
    error.value = null;
    try {
      const payload = await fetchWrapper.get(`${baseUrl}/workstations`) as RobotWorkstation[];
      workstations.value = payload.map(normalizeWorkstation);
    } catch (err: unknown) {
      workstations.value = [];
      error.value = getErrorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    workstations,
    healthyCount,
    staleCount,
    totalCount,
    lastAlertAt,
    fetchWorkstations
  };
});
