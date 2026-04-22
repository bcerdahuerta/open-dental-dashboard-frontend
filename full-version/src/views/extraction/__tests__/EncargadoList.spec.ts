import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { shallowMount, flushPromises } from '@vue/test-utils';
import EncargadoList from '@/views/extraction/EncargadoList.vue';
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

describe('EncargadoList clinic assignment UI', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/clients?')) {
        return [{ id: 'client-1', client_name: 'Mint Dentistry', product_type: 'Custom', is_active: true, slack_webhook: null, slack_qa_ids: null, days_in_advance: 4, created_at: '', updated_at: '' }];
      }
      if (url.includes('/clinics?')) {
        return [{ id: 'clinic-1', client_id: 'client-1', clinic_name: 'Mint Irving', ccc_clinic_id: null, clinic_num: 1, spreadsheet_id: null, folder_id: null, images_folder_id: 131, is_active: true, drive_permission_status: 'pending', folder_drive_permission_status: 'pending', created_at: '' }];
      }
      if (url.includes('/encargados')) {
        return [{ id: 'enc-1', name: 'Ana Perez', email: 'ana@example.com', is_active: true, clinic_ids: ['clinic-1'], client_ids: ['client-1'], resolved_assignment_scope: 'clinic', resolved_assignment_client_ids: ['client-1'], resolved_assignment_clinic_ids: ['clinic-1'], created_at: '', updated_at: '' }];
      }
      return [];
    });
  });

  it('renders clinic-first assignment copy and keeps legacy fallback visible', async () => {
    const wrapper = shallowMount(EncargadoList, {
      global: {
        stubs: {
          BaseBreadcrumb: { template: '<div class="breadcrumb-stub"></div>' },
          UiParentCard: { template: '<div><slot /></div>' },
          VDataTable: { template: '<div class="v-data-table-stub"><slot name="no-data" /></div>' },
          VDialog: { template: '<div class="v-dialog-stub"><slot /></div>' },
          VCard: { template: '<div><slot /></div>' },
          VCardTitle: { template: '<div><slot /></div>' },
          VCardText: { template: '<div><slot /></div>' },
          VCardActions: { template: '<div><slot /></div>' },
          VForm: { template: '<form><slot /></form>' },
          VRow: { template: '<div><slot /></div>' },
          VCol: { template: '<div><slot /></div>' },
          VBtn: { template: '<button><slot /></button>' },
          VSpacer: true,
          VTextField: { template: '<input />' },
          VSwitch: { template: '<input type="checkbox" />' },
          VSelect: { template: '<select></select>' },
          VChip: { template: '<span><slot /></span>' },
          VAlert: { template: '<div><slot /></div>' },
          VSnackbar: { template: '<div><slot /></div>' },
          PlusIcon: true,
          PencilIcon: true,
          RefreshIcon: true,
          UsersIcon: true
        }
      }
    });

    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Clinic Assignments');
    expect(text).toContain('Clinics');
    expect(text).toContain('Legacy Fallback (Clients)');
    expect(text).toContain('Create one to start assigning clinics');
  });
});
