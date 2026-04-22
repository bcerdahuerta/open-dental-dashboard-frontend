import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useExtractionStore } from '@/stores/extraction';
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

describe('extraction store clinic assignments', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('assigns clinics through clinic assignment endpoint and updates local encargado cache', async () => {
    const store = useExtractionStore();
    store.encargados = [
      {
        id: 'enc-1',
        name: 'Ana Perez',
        email: 'ana@example.com',
        is_active: true,
        clinic_ids: [],
        client_ids: ['client-legacy'],
        resolved_assignment_scope: 'client',
        resolved_assignment_client_ids: ['client-legacy'],
        resolved_assignment_clinic_ids: ['clinic-old'],
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z'
      }
    ];

    vi.mocked(fetchWrapper.post).mockResolvedValue({
      id: 'enc-1',
      name: 'Ana Perez',
      email: 'ana@example.com',
      is_active: true,
      clinic_ids: ['clinic-1', 'clinic-2'],
      client_ids: ['client-legacy'],
      resolved_assignment_scope: 'clinic',
      resolved_assignment_client_ids: ['client-1'],
      resolved_assignment_clinic_ids: ['clinic-1', 'clinic-2'],
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-02T00:00:00Z'
    });

    const updated = await store.assignClinics('enc-1', ['clinic-1', 'clinic-2']);

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      expect.stringContaining('/encargados/enc-1/clinics'),
      { clinic_ids: ['clinic-1', 'clinic-2'] }
    );
    expect(updated.resolved_assignment_scope).toBe('clinic');
    expect(store.encargados[0].clinic_ids).toEqual(['clinic-1', 'clinic-2']);
    expect(store.encargados[0].resolved_assignment_clinic_ids).toEqual(['clinic-1', 'clinic-2']);
  });

  it('keeps legacy client assignment endpoint available for fallback workflows', async () => {
    const store = useExtractionStore();
    store.encargados = [
      {
        id: 'enc-2',
        name: 'Marco Ruiz',
        email: 'marco@example.com',
        is_active: true,
        clinic_ids: [],
        client_ids: [],
        resolved_assignment_scope: 'unassigned',
        resolved_assignment_client_ids: [],
        resolved_assignment_clinic_ids: [],
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z'
      }
    ];

    vi.mocked(fetchWrapper.post).mockResolvedValue({
      ...store.encargados[0],
      client_ids: ['client-1', 'client-2'],
      resolved_assignment_scope: 'client',
      resolved_assignment_client_ids: ['client-1', 'client-2'],
      resolved_assignment_clinic_ids: ['clinic-1', 'clinic-2']
    });

    const updated = await store.assignClients('enc-2', ['client-1', 'client-2']);

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      expect.stringContaining('/encargados/enc-2/clients'),
      { client_ids: ['client-1', 'client-2'] }
    );
    expect(updated.resolved_assignment_scope).toBe('client');
    expect(store.encargados[0].client_ids).toEqual(['client-1', 'client-2']);
  });

  it('normalizes workforce payloads with null-safe capacity and analytics status fields', async () => {
    const store = useExtractionStore();

    vi.mocked(fetchWrapper.get).mockResolvedValue([
      {
        id: 'enc-3',
        name: 'Lucia Gomez',
        email: 'lucia@example.com',
        is_active: true,
        clinic_ids: ['clinic-1'],
        client_ids: ['client-legacy'],
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-1'],
        resolved_assignment_clinic_ids: ['clinic-1'],
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z'
      }
    ]);

    const members = await store.fetchEncargados();

    expect(members[0].resolved_clinic_ownership).toEqual([]);
    expect(members[0].workload_summary).toEqual({
      resolved_client_count: 1,
      resolved_clinic_count: 1,
      direct_clinic_count: 1,
      legacy_client_count: 1
    });
    expect(members[0].capacity).toEqual({
      status: 'unavailable',
      max_clinics: null,
      assigned_clinic_count: 1,
      available_clinic_slots: null,
      utilization_ratio: null
    });
    expect(members[0].analytics_status).toEqual({
      state: 'pending',
      missing_metrics: ['verification_volume', 'completion_rate'],
      updated_at: null
    });
  });

  it('preserves workforce payloads when contract fields are present', async () => {
    const store = useExtractionStore();

    vi.mocked(fetchWrapper.get).mockResolvedValue([
      {
        id: 'enc-3',
        name: 'Lucia Gomez',
        email: 'lucia@example.com',
        is_active: true,
        clinic_ids: ['clinic-1'],
        client_ids: ['client-legacy'],
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-1'],
        resolved_assignment_clinic_ids: ['clinic-1'],
        resolved_clinic_ownership: [
          {
            clinic_id: 'clinic-1',
            clinic_name: 'Clinic 1',
            client_id: 'client-1',
            client_name: 'Route Test Client',
            assignment_source: 'clinic'
          }
        ],
        workload_summary: {
          resolved_client_count: 1,
          resolved_clinic_count: 1,
          direct_clinic_count: 1,
          legacy_client_count: 1
        },
        capacity: {
          status: 'unavailable',
          max_clinics: null,
          assigned_clinic_count: 1,
          available_clinic_slots: null,
          utilization_ratio: null
        },
        analytics_status: {
          state: 'pending',
          missing_metrics: ['verification_volume', 'completion_rate'],
          updated_at: null
        },
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z'
      }
    ]);

    const members = await store.fetchEncargados();

    expect(members[0].resolved_clinic_ownership).toEqual([
      {
        clinic_id: 'clinic-1',
        clinic_name: 'Clinic 1',
        client_id: 'client-1',
        client_name: 'Route Test Client',
        assignment_source: 'clinic'
      }
    ]);
    expect(members[0].workload_summary).toEqual({
      resolved_client_count: 1,
      resolved_clinic_count: 1,
      direct_clinic_count: 1,
      legacy_client_count: 1
    });
    expect(members[0].capacity).toEqual({
      status: 'unavailable',
      max_clinics: null,
      assigned_clinic_count: 1,
      available_clinic_slots: null,
      utilization_ratio: null
    });
    expect(members[0].analytics_status).toEqual({
      state: 'pending',
      missing_metrics: ['verification_volume', 'completion_rate'],
      updated_at: null
    });
  });

  it('normalizes analytics payloads without stub metric fields', async () => {
    const store = useExtractionStore();

    vi.mocked(fetchWrapper.get).mockResolvedValue({
      encargado_id: 'enc-3',
      resolved_assignment_scope: 'clinic',
      resolved_assignment_client_ids: ['client-1'],
      resolved_assignment_clinic_ids: ['clinic-1'],
      metrics: {
        client_count: 1,
        clinic_count: 1,
        verification_volume: null,
        completion_rate: null
      }
    });

    const analytics = await store.fetchAnalytics('enc-3');

    expect(analytics.metrics).toEqual({
      client_count: 1,
      clinic_count: 1,
      verification_volume: null,
      completion_rate: null
    });
    expect(analytics.resolved_clinic_ownership).toEqual([]);
    expect(analytics.workload_summary).toEqual({
      resolved_client_count: 1,
      resolved_clinic_count: 1,
      direct_clinic_count: 0,
      legacy_client_count: 0
    });
    expect(analytics.capacity).toEqual({
      status: 'unavailable',
      max_clinics: null,
      assigned_clinic_count: 0,
      available_clinic_slots: null,
      utilization_ratio: null
    });
    expect(analytics.analytics_status).toEqual({
      state: 'pending',
      missing_metrics: ['verification_volume', 'completion_rate'],
      updated_at: null
    });
    expect(store.encargadoAnalytics['enc-3'].metrics.clinic_count).toBe(1);
  });

  it('opens workforce drawer and avoids duplicate analytics fetches for cached members', async () => {
    const store = useExtractionStore();
    store.encargados = [
      {
        id: 'enc-4',
        name: 'Drawer User',
        email: 'drawer@example.com',
        is_active: true,
        clinic_ids: ['clinic-1'],
        client_ids: ['client-1'],
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-1'],
        resolved_assignment_clinic_ids: ['clinic-1'],
        resolved_clinic_ownership: [],
        workload_summary: { resolved_client_count: 1, resolved_clinic_count: 1, direct_clinic_count: 1, legacy_client_count: 1 },
        capacity: { status: 'unavailable', max_clinics: null, assigned_clinic_count: 1, available_clinic_slots: null, utilization_ratio: null },
        analytics_status: { state: 'pending', missing_metrics: ['verification_volume', 'completion_rate'], updated_at: null },
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z'
      }
    ];
    vi.mocked(fetchWrapper.get).mockResolvedValue({
      encargado_id: 'enc-4',
      resolved_assignment_scope: 'clinic',
      resolved_assignment_client_ids: ['client-1'],
      resolved_assignment_clinic_ids: ['clinic-1'],
      metrics: { client_count: 1, clinic_count: 1, verification_volume: null, completion_rate: null }
    });

    await store.openWorkforceMember('enc-4');
    await store.openWorkforceMember('enc-4');

    expect(store.drawerOpen).toBe(true);
    expect(store.selectedEncargadoId).toBe('enc-4');
    expect(vi.mocked(fetchWrapper.get)).toHaveBeenCalledTimes(1);
  });

  it('switches drawer target and fetches analytics only for uncached member', async () => {
    const store = useExtractionStore();
    store.encargados = [
      {
        id: 'enc-4',
        name: 'Drawer User A',
        email: 'drawer-a@example.com',
        is_active: true,
        clinic_ids: ['clinic-1'],
        client_ids: ['client-1'],
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-1'],
        resolved_assignment_clinic_ids: ['clinic-1'],
        resolved_clinic_ownership: [],
        workload_summary: { resolved_client_count: 1, resolved_clinic_count: 1, direct_clinic_count: 1, legacy_client_count: 1 },
        capacity: { status: 'unavailable', max_clinics: null, assigned_clinic_count: 1, available_clinic_slots: null, utilization_ratio: null },
        analytics_status: { state: 'pending', missing_metrics: ['verification_volume', 'completion_rate'], updated_at: null },
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z'
      },
      {
        id: 'enc-6',
        name: 'Drawer User B',
        email: 'drawer-b@example.com',
        is_active: true,
        clinic_ids: ['clinic-2'],
        client_ids: ['client-2'],
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-2'],
        resolved_assignment_clinic_ids: ['clinic-2'],
        resolved_clinic_ownership: [],
        workload_summary: { resolved_client_count: 1, resolved_clinic_count: 1, direct_clinic_count: 1, legacy_client_count: 1 },
        capacity: { status: 'unavailable', max_clinics: null, assigned_clinic_count: 1, available_clinic_slots: null, utilization_ratio: null },
        analytics_status: { state: 'pending', missing_metrics: ['verification_volume', 'completion_rate'], updated_at: null },
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z'
      }
    ];
    store.encargadoAnalytics = {
      'enc-4': {
        encargado_id: 'enc-4',
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-1'],
        resolved_assignment_clinic_ids: ['clinic-1'],
        resolved_clinic_ownership: [],
        workload_summary: { resolved_client_count: 1, resolved_clinic_count: 1, direct_clinic_count: 0, legacy_client_count: 0 },
        capacity: { status: 'unavailable', max_clinics: null, assigned_clinic_count: 0, available_clinic_slots: null, utilization_ratio: null },
        analytics_status: { state: 'ready', missing_metrics: [], updated_at: '2026-04-22T00:00:00Z' },
        metrics: { client_count: 1, clinic_count: 1, verification_volume: 3, completion_rate: 95 }
      }
    };
    vi.mocked(fetchWrapper.get).mockResolvedValue({
      encargado_id: 'enc-6',
      resolved_assignment_scope: 'clinic',
      resolved_assignment_client_ids: ['client-2'],
      resolved_assignment_clinic_ids: ['clinic-2'],
      metrics: { client_count: 1, clinic_count: 1, verification_volume: null, completion_rate: null }
    });

    await store.openWorkforceMember('enc-4');
    await store.openWorkforceMember('enc-6');

    expect(store.selectedEncargadoId).toBe('enc-6');
    expect(store.drawerOpen).toBe(true);
    expect(vi.mocked(fetchWrapper.get)).toHaveBeenCalledTimes(1);
  });

  it('keeps table loading false while drawer analytics request is in flight', async () => {
    const store = useExtractionStore();
    store.encargados = [
      {
        id: 'enc-7',
        name: 'Loading User',
        email: 'loading@example.com',
        is_active: true,
        clinic_ids: ['clinic-1'],
        client_ids: ['client-1'],
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-1'],
        resolved_assignment_clinic_ids: ['clinic-1'],
        resolved_clinic_ownership: [],
        workload_summary: { resolved_client_count: 1, resolved_clinic_count: 1, direct_clinic_count: 1, legacy_client_count: 1 },
        capacity: { status: 'unavailable', max_clinics: null, assigned_clinic_count: 1, available_clinic_slots: null, utilization_ratio: null },
        analytics_status: { state: 'pending', missing_metrics: ['verification_volume', 'completion_rate'], updated_at: null },
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z'
      }
    ];

    let resolveRequest: ((value: unknown) => void) | null = null;
    vi.mocked(fetchWrapper.get).mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const requestPromise = store.ensureWorkforceAnalytics('enc-7', true);

    expect(store.loading).toBe(false);
    expect(store.analyticsLoadingById['enc-7']).toBe(true);

    if (!resolveRequest) {
      throw new Error('Expected analytics request resolver to be captured');
    }

    const completeRequest = resolveRequest as (value: Record<string, unknown>) => void;

    completeRequest({
      encargado_id: 'enc-7',
      resolved_assignment_scope: 'clinic',
      resolved_assignment_client_ids: ['client-1'],
      resolved_assignment_clinic_ids: ['clinic-1'],
      metrics: { client_count: 1, clinic_count: 1, verification_volume: null, completion_rate: null }
    });
    await requestPromise;

    expect(store.loading).toBe(false);
    expect(store.analyticsLoadingById['enc-7']).toBe(false);
  });

  it('rolls back optimistic clinic reassignment when API commit fails', async () => {
    const store = useExtractionStore();
    store.encargados = [
      {
        id: 'enc-5',
        name: 'Rollback User',
        email: 'rollback@example.com',
        is_active: true,
        clinic_ids: ['clinic-1'],
        client_ids: ['client-1'],
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-1'],
        resolved_assignment_clinic_ids: ['clinic-1'],
        resolved_clinic_ownership: [],
        workload_summary: { resolved_client_count: 1, resolved_clinic_count: 1, direct_clinic_count: 1, legacy_client_count: 1 },
        capacity: { status: 'unavailable', max_clinics: null, assigned_clinic_count: 1, available_clinic_slots: null, utilization_ratio: null },
        analytics_status: { state: 'pending', missing_metrics: ['verification_volume', 'completion_rate'], updated_at: null },
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z'
      }
    ];
    store.encargadoAnalytics = {
      'enc-5': {
        encargado_id: 'enc-5',
        resolved_assignment_scope: 'clinic',
        resolved_assignment_client_ids: ['client-1'],
        resolved_assignment_clinic_ids: ['clinic-1'],
        resolved_clinic_ownership: [],
        workload_summary: { resolved_client_count: 1, resolved_clinic_count: 1, direct_clinic_count: 0, legacy_client_count: 0 },
        capacity: { status: 'unavailable', max_clinics: null, assigned_clinic_count: 0, available_clinic_slots: null, utilization_ratio: null },
        analytics_status: { state: 'pending', missing_metrics: ['verification_volume', 'completion_rate'], updated_at: null },
        metrics: { client_count: 1, clinic_count: 1, verification_volume: null, completion_rate: null }
      }
    };
    vi.mocked(fetchWrapper.post).mockRejectedValue(new Error('commit failed'));

    await expect(store.assignClinicsOptimistic('enc-5', ['clinic-2'])).rejects.toThrow('commit failed');

    expect(store.encargados[0].clinic_ids).toEqual(['clinic-1']);
    expect(store.encargadoAnalytics['enc-5'].metrics.clinic_count).toBe(1);
    expect(store.reassignmentPendingById['enc-5']).toBe(false);
  });
});
