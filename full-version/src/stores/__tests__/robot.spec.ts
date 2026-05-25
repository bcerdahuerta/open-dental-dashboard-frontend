import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useRobotStore } from '@/stores/robot';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('robot store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches workstations and computes healthy/stale counters', async () => {
    const store = useRobotStore();

    vi.mocked(fetchWrapper.get).mockResolvedValue([
      {
        id: 'rw-1',
        workstation_name: 'MINT-OPS-01',
        status: 'HEALTHY',
        first_seen_at: '2026-05-22T10:00:00Z',
        last_seen_at: '2026-05-22T10:10:00Z',
        alerted_stale: false,
        alerted_at: null,
        last_recovered_at: null,
        created_at: '2026-05-22T10:00:00Z',
        updated_at: '2026-05-22T10:10:00Z'
      },
      {
        id: 'rw-2',
        workstation_name: 'MINT-OPS-02',
        status: 'STALE',
        first_seen_at: '2026-05-22T10:00:00Z',
        last_seen_at: '2026-05-22T08:00:00Z',
        alerted_stale: true,
        alerted_at: '2026-05-22T09:00:00Z',
        last_recovered_at: null,
        created_at: '2026-05-22T10:00:00Z',
        updated_at: '2026-05-22T09:00:00Z'
      }
    ]);

    await store.fetchWorkstations();

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/robots/workstations'));
    expect(store.workstations).toHaveLength(2);
    expect(store.healthyCount).toBe(1);
    expect(store.staleCount).toBe(1);
  });

  it('captures fetch errors and resets workstation list', async () => {
    const store = useRobotStore();
    store.workstations = [
      {
        id: 'rw-1',
        workstation_name: 'MINT-OPS-01',
        status: 'HEALTHY',
        first_seen_at: '2026-05-22T10:00:00Z',
        last_seen_at: '2026-05-22T10:10:00Z',
        alerted_stale: false,
        alerted_at: null,
        last_recovered_at: null,
        created_at: '2026-05-22T10:00:00Z',
        updated_at: '2026-05-22T10:10:00Z'
      }
    ];

    vi.mocked(fetchWrapper.get).mockRejectedValue(new Error('backend unavailable'));

    await store.fetchWorkstations();

    expect(store.workstations).toEqual([]);
    expect(store.error).toContain('backend unavailable');
  });
});
