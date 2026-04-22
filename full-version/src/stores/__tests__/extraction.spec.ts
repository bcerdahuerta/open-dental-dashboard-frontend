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
});
