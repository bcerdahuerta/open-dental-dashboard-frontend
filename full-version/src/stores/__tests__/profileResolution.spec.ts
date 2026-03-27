import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useProfileResolutionStore } from '@/stores/profileResolution';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('profileResolution store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('normalizes verification_status before resolve-explain submit', async () => {
    const store = useProfileResolutionStore();
    vi.mocked(fetchWrapper.post).mockResolvedValue({
      winner: null,
      candidates: [],
      normalized_status: 'maxout'
    });

    await store.resolveExplain({
      client_id: 'client-1',
      clinic_id: 'clinic-1',
      verification_type: 'ELG',
      verification_status: 'Max Out'
    });

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      expect.stringContaining('/pipeline/resolve-explain'),
      expect.objectContaining({
        verification_status: 'maxout',
        verification_type: 'ELG',
        client_id: 'client-1',
        clinic_id: 'clinic-1'
      })
    );
    expect(store.sessionHistory).toHaveLength(1);
    expect(store.sessionHistory[0].normalized_request.verification_status_normalized).toBe('maxout');
  });

  it('keeps unresolved payload as valid explain result', async () => {
    const store = useProfileResolutionStore();
    vi.mocked(fetchWrapper.post).mockResolvedValue({
      winner: null,
      candidates: [
        {
          scope: 'client_assignment',
          matched: false,
          precedence: 1,
          profile: { id: 'bp-1', name: 'Base 1' }
        }
      ],
      normalized_status: 'unknown',
      unresolved: true
    });

    const response = await store.resolveExplain({
      client_id: 'client-2',
      clinic_id: 'clinic-2',
      verification_type: 'ELG',
      verification_status: 'Unknown'
    });

    expect(response.winner).toBeNull();
    expect(response.unresolved).toBe(true);
    expect(store.hasSimulatorResult).toBe(true);
  });

  // ============================================
  // Editing State Tests
  // ============================================

  describe('editing state', () => {
    it('sets editing assignment and opens panel', () => {
      const store = useProfileResolutionStore();
      const assignment = {
        id: 'assign-1',
        client_id: 'client-1',
        base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      store.setEditingAssignment(assignment, 'edit');

      expect(store.editingAssignment).not.toBeNull();
      expect(store.editingAssignment?.id).toBe('assign-1');
      expect(store.editingMode).toBe('edit');
      expect(store.isPanelOpen).toBe(true);
      expect(store.editingOverride).toBeNull();
    });

    it('sets editing override and opens panel', () => {
      const store = useProfileResolutionStore();
      const override = {
        id: 'override-1',
        clinic_id: 'clinic-1',
        override_base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      store.setEditingOverride(override, 'edit');

      expect(store.editingOverride).not.toBeNull();
      expect(store.editingOverride?.id).toBe('override-1');
      expect(store.editingMode).toBe('edit');
      expect(store.isPanelOpen).toBe(true);
      expect(store.editingAssignment).toBeNull();
    });

    it('closes panel and clears editing state', () => {
      const store = useProfileResolutionStore();
      const assignment = {
        id: 'assign-1',
        client_id: 'client-1',
        base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      store.setEditingAssignment(assignment, 'edit');
      expect(store.isPanelOpen).toBe(true);

      store.closePanel();
      
      expect(store.isPanelOpen).toBe(false);
      expect(store.editingAssignment).toBeNull();
      expect(store.editingOverride).toBeNull();
      expect(store.editingMode).toBe('create');
    });

    it('creates null assignment for create mode', () => {
      const store = useProfileResolutionStore();

      store.setEditingAssignment(null, 'create');

      expect(store.editingAssignment).toBeNull();
      expect(store.editingMode).toBe('create');
      expect(store.isPanelOpen).toBe(true);
    });
  });

  // ============================================
  // CRUD Actions Tests
  // ============================================

  describe('CRUD actions', () => {
    it('creates assignment via POST', async () => {
      const store = useProfileResolutionStore();
      vi.mocked(fetchWrapper.post).mockResolvedValue({
        id: 'assign-new',
        client_id: 'client-1',
        base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        context_rules: { has_shortform: false },
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      });

      const result = await store.createAssignment('client-1', {
        client_id: 'client-1',
        base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        context_rules: { has_shortform: false }
      });

      expect(fetchWrapper.post).toHaveBeenCalledWith(
        expect.stringContaining('/clients/client-1/profile-assignments'),
        expect.objectContaining({
          base_profile_id: 'bp-1',
          verification_type: 'ELG'
        })
      );
      expect(result.id).toBe('assign-new');
      expect(store.clientAssignments).toHaveLength(1);
    });

    it('updates assignment via PUT', async () => {
      const store = useProfileResolutionStore();
      // First, seed the store with an existing assignment
      vi.mocked(fetchWrapper.get).mockResolvedValue([{
        id: 'assign-1',
        client_id: 'client-1',
        base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }]);
      await store.fetchClientAssignments('client-1');

      vi.mocked(fetchWrapper.put).mockResolvedValue({
        id: 'assign-1',
        client_id: 'client-1',
        base_profile_id: 'bp-2',
        verification_type: 'ELG',
        target_statuses: ['New Patient'],
        precedence: 75,
        context_rules: { has_shortform: true },
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-02'
      });

      const result = await store.updateAssignment('assign-1', {
        base_profile_id: 'bp-2',
        precedence: 75,
        target_statuses: ['New Patient'],
        context_rules: { has_shortform: true }
      });

      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/profile-assignments/assign-1'),
        expect.objectContaining({
          precedence: 75,
          target_statuses: ['New Patient']
        })
      );
      expect(result.precedence).toBe(75);
      expect(store.clientAssignments[0].precedence).toBe(75);
    });

    it('deactivates assignment via DELETE', async () => {
      const store = useProfileResolutionStore();
      // Seed the store
      vi.mocked(fetchWrapper.get).mockResolvedValue([{
        id: 'assign-1',
        client_id: 'client-1',
        base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }]);
      await store.fetchClientAssignments('client-1');

      vi.mocked(fetchWrapper.delete).mockResolvedValue({});

      await store.deactivateAssignment('assign-1');

      expect(fetchWrapper.delete).toHaveBeenCalledWith(
        expect.stringContaining('/profile-assignments/assign-1')
      );
      expect(store.clientAssignments[0].is_active).toBe(false);
    });

    it('creates override via POST', async () => {
      const store = useProfileResolutionStore();
      vi.mocked(fetchWrapper.post).mockResolvedValue({
        id: 'override-new',
        clinic_id: 'clinic-1',
        override_base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        context_rules: { has_shortform: false },
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      });

      const result = await store.createOverride('clinic-1', {
        clinic_id: 'clinic-1',
        client_assignment_id: null,
        override_base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        context_rules: { has_shortform: false }
      });

      expect(fetchWrapper.post).toHaveBeenCalledWith(
        expect.stringContaining('/clinics/clinic-1/profile-overrides'),
        expect.objectContaining({
          override_base_profile_id: 'bp-1'
        })
      );
      expect(result.id).toBe('override-new');
      expect(store.clinicOverrides).toHaveLength(1);
    });

    it('updates override via PUT', async () => {
      const store = useProfileResolutionStore();
      vi.mocked(fetchWrapper.get).mockResolvedValue([{
        id: 'override-1',
        clinic_id: 'clinic-1',
        override_base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }]);
      await store.fetchClinicOverrides('clinic-1');

      vi.mocked(fetchWrapper.put).mockResolvedValue({
        id: 'override-1',
        clinic_id: 'clinic-1',
        override_base_profile_id: 'bp-2',
        verification_type: 'ELG',
        target_statuses: ['New Patient'],
        precedence: 80,
        context_rules: { has_shortform: true },
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-02'
      });

      const result = await store.updateOverride('override-1', {
        override_base_profile_id: 'bp-2',
        precedence: 80
      });

      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/profile-overrides/override-1'),
        expect.objectContaining({
          precedence: 80
        })
      );
      expect(result.precedence).toBe(80);
    });

    it('deactivates override via DELETE', async () => {
      const store = useProfileResolutionStore();
      vi.mocked(fetchWrapper.get).mockResolvedValue([{
        id: 'override-1',
        clinic_id: 'clinic-1',
        override_base_profile_id: 'bp-1',
        verification_type: 'ELG',
        target_statuses: ['Max Out'],
        precedence: 50,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }]);
      await store.fetchClinicOverrides('clinic-1');

      vi.mocked(fetchWrapper.delete).mockResolvedValue({});

      await store.deactivateOverride('override-1');

      expect(fetchWrapper.delete).toHaveBeenCalledWith(
        expect.stringContaining('/profile-overrides/override-1')
      );
      expect(store.clinicOverrides[0].is_active).toBe(false);
    });
  });

  // ============================================
  // Base Profile Helpers Tests
  // ============================================

  describe('base profile helpers', () => {
    it('filters base profiles by verification type', async () => {
      const store = useProfileResolutionStore();
      vi.mocked(fetchWrapper.get).mockResolvedValue([
        { id: 'bp-1', profile_name: 'ELG Profile', verification_type: 'ELG', context_requirements: [], is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'bp-2', profile_name: 'INS Profile', verification_type: 'INS', context_requirements: [], is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'bp-3', profile_name: 'ELG Inactive', verification_type: 'ELG', context_requirements: [], is_active: false, created_at: '2024-01-01', updated_at: '2024-01-01' }
      ]);

      await store.fetchBaseProfiles();

      const elgProfiles = store.getBaseProfilesByVerificationType('ELG');
      
      expect(elgProfiles).toHaveLength(1);
      expect(elgProfiles[0].id).toBe('bp-1');
    });
  });
});
