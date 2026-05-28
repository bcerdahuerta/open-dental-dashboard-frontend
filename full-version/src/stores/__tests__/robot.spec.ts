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

  it('deletes a workstation and recomputes counters', async () => {
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
    ];

    vi.mocked(fetchWrapper.delete).mockResolvedValue(undefined);

    const deletePromise = store.deleteWorkstation('rw-2');
    expect(store.deletingIds).toContain('rw-2');

    await deletePromise;

    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringContaining('/robots/workstations/rw-2'));
    expect(store.workstations.map((item) => item.id)).toEqual(['rw-1']);
    expect(store.totalCount).toBe(1);
    expect(store.healthyCount).toBe(1);
    expect(store.staleCount).toBe(0);
    expect(store.deletingIds).not.toContain('rw-2');
    expect(store.error).toBeNull();
  });

  it('propagates delete errors and keeps workstation list', async () => {
    const store = useRobotStore();
    store.workstations = [
      {
        id: 'rw-3',
        workstation_name: 'MINT-OPS-03',
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

    vi.mocked(fetchWrapper.delete).mockRejectedValue(new Error('delete failed'));

    await expect(store.deleteWorkstation('rw-3')).rejects.toThrow('delete failed');

    expect(store.workstations.map((item) => item.id)).toEqual(['rw-3']);
    expect(store.totalCount).toBe(1);
    expect(store.deletingIds).not.toContain('rw-3');
    expect(store.error).toContain('delete failed');
  });
});
