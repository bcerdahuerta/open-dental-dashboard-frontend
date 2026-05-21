import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useClinicStore } from '@/stores/clinics';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('clinics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('retries drive permission and patches current clinic/list status', async () => {
    const store = useClinicStore();
    store.currentClinic = {
      id: 'clinic-1',
      client_id: 'client-1',
      clinic_name: 'Clinic 1',
      ccc_clinic_id: null,
      clinic_num: null,
      spreadsheet_id: null,
      folder_id: null,
      images_folder_id: 131,
      is_active: true,
      drive_permission_status: 'failed',
      folder_drive_permission_status: 'failed',
      created_at: '2026-01-01T00:00:00Z'
    };
    store.clinics = [
      {
        id: 'clinic-1',
        client_id: 'client-1',
        clinic_name: 'Clinic 1',
        ccc_clinic_id: null,
        clinic_num: null,
        spreadsheet_id: null,
        folder_id: null,
        images_folder_id: 131,
        is_active: true,
        drive_permission_status: 'failed',
        folder_drive_permission_status: 'failed',
        created_at: '2026-01-01T00:00:00Z'
      }
    ];

    vi.mocked(fetchWrapper.post).mockResolvedValue({
      clinic_id: 'clinic-1',
      drive_permission_status: 'pending',
      folder_drive_permission_status: 'granted'
    });

    const response = await store.retryDrivePermission('clinic-1');

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      expect.stringContaining('/clinics/clinic-1/drive-permission/retry'),
      {}
    );
    expect(response.drive_permission_status).toBe('pending');
    expect(response.folder_drive_permission_status).toBe('granted');
    expect(store.currentClinic?.drive_permission_status).toBe('pending');
    expect(store.currentClinic?.folder_drive_permission_status).toBe('granted');
    expect(store.clinics[0].drive_permission_status).toBe('pending');
    expect(store.clinics[0].folder_drive_permission_status).toBe('granted');
  });

  it('falls back to null drive status when response is missing status', async () => {
    const store = useClinicStore();
    store.currentClinic = {
      id: 'clinic-2',
      client_id: 'client-1',
      clinic_name: 'Clinic 2',
      ccc_clinic_id: null,
      clinic_num: null,
      spreadsheet_id: null,
      folder_id: null,
      images_folder_id: 131,
      is_active: true,
      drive_permission_status: 'pending',
      folder_drive_permission_status: 'pending',
      created_at: '2026-01-01T00:00:00Z'
    };

    vi.mocked(fetchWrapper.post).mockResolvedValue({ clinic_id: 'clinic-2' });

    await store.retryDrivePermission('clinic-2');

    expect(store.currentClinic?.drive_permission_status).toBeNull();
    expect(store.currentClinic?.folder_drive_permission_status).toBeNull();
  });

  it('passes resource query parameter on retry', async () => {
    const store = useClinicStore();
    vi.mocked(fetchWrapper.post).mockResolvedValue({
      clinic_id: 'clinic-3',
      drive_permission_status: 'pending',
      folder_drive_permission_status: 'pending'
    });

    await store.retryDrivePermission('clinic-3', 'folder');

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      expect.stringContaining('/clinics/clinic-3/drive-permission/retry?resource=folder'),
      {}
    );
  });

  it('fetches effective pipelines for a clinic', async () => {
    const store = useClinicStore();
    const mockResponse = {
      effective_pipelines: [
        {
          source: 'client_assignment',
          source_id: 'assign-1',
          verification_type: 'ELG',
          target_statuses: ['Active'],
          precedence: 1,
          context_rules: {},
          base_profile: { id: 'bp-1', profile_name: 'DR Basic Writeback', verification_type: 'ELG', target_status: 'Active', is_base: true },
          steps: [{ step_order: 1, step_type: 'plan_matching', step_config: {}, is_enabled: true, on_failure: 'HALT', run_condition: null }]
        }
      ]
    };
    vi.mocked(fetchWrapper.get).mockResolvedValue(mockResponse);

    const result = await store.fetchEffectivePipelines('clinic-1');

    expect(fetchWrapper.get).toHaveBeenCalledWith(
      expect.stringContaining('/clinics/clinic-1/effective-pipelines')
    );
    expect(result).toEqual(mockResponse);
    expect(store.effectivePipelines).toEqual(mockResponse.effective_pipelines);
  });

  it('handles empty effective pipelines gracefully', async () => {
    const store = useClinicStore();
    vi.mocked(fetchWrapper.get).mockResolvedValue({ effective_pipelines: [] });

    const result = await store.fetchEffectivePipelines('clinic-2');

    expect(result.effective_pipelines).toEqual([]);
    expect(store.effectivePipelines).toEqual([]);
  });
});
