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

describe('EncargadoList workforce shell', () => {
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

  it('renders shell actions and workforce composition without expandable rows', async () => {
    const wrapper = shallowMount(EncargadoList, {
      global: {
        stubs: {
          BaseBreadcrumb: { template: '<div class="breadcrumb-stub"></div>' },
          UiParentCard: { template: '<div><slot /><slot name="action" /></div>' },
          WorkforceTable: { template: '<div class="workforce-table-stub">workforce table</div>' },
          WorkforceDrawer: { template: '<div class="workforce-drawer-stub">workforce drawer</div>' },
          VRow: { template: '<div><slot /></div>' },
          VCol: { template: '<div><slot /></div>' },
          VBtn: { template: '<button><slot /></button>' },
          VTextField: { template: '<input />' },
          VAlert: { template: '<div><slot /></div>' },
          VSnackbar: { template: '<div><slot /></div>' },
          VNavigationDrawer: { template: '<div><slot /></div>' },
          PlusIcon: true,
          RefreshIcon: true
        }
      }
    });

    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('workforce table');
    expect(text).toContain('workforce drawer');
    expect(text).toContain('Refresh');
    expect(text).toContain('New Team Member');
    expect(text).not.toContain('Create Team Member');
  });
});
