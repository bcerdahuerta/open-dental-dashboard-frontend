import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ProfileResolution from '@/views/admin/ProfileResolution.vue';
import ProfileResolutionSimulatorForm from '@/components/writeback/ProfileResolutionSimulatorForm.vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

function setupGetMock() {
  vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
    if (url.includes('/base-profiles')) {
      return [
        {
          id: 'bp-1',
          profile_name: 'Base',
          context_requirements: [],
          is_active: true,
          created_at: '',
          updated_at: ''
        }
      ];
    }
    if (url.includes('/clients/') && url.includes('/profile-assignments')) return [];
    if (url.includes('/clinics/') && url.includes('/profile-overrides')) return [];
    if (url.includes('/clients')) return [{ id: 'c-1', client_name: 'Burch', product_type: 'writeback', is_active: true, slack_webhook: null, slack_qa_ids: null, days_in_advance: 5, created_at: '', updated_at: '' }];
    if (url.includes('/clinics')) return [{ id: 'k-1', clinic_name: 'Clinic A' }];
    return [];
  });
}

describe('ProfileResolution view', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    setupGetMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses remote search for client and clinic selectors', async () => {
    const wrapper = mount(ProfileResolution, {
      global: {
        stubs: {
          UiParentCard: { template: '<div><slot /></div>' },
          // Stub the editor panels since they use VNavigationDrawer which requires layout context
          AssignmentEditorPanel: { template: '<div class="assignment-editor-panel-stub"></div>' },
          OverrideEditorPanel: { template: '<div class="override-editor-panel-stub"></div>' },
          VDialog: { template: '<div class="v-dialog-stub"><slot /></div>' }
        }
      }
    });

    await vi.runAllTimersAsync();
    await nextTick();

    const simulatorForm = wrapper.findComponent(ProfileResolutionSimulatorForm);
    simulatorForm.vm.$emit('update:client-search', 'bur');

    await nextTick();
    await vi.advanceTimersByTimeAsync(350);

    simulatorForm.vm.$emit('update:clinic-search', 'clinic a');

    await nextTick();
    await vi.advanceTimersByTimeAsync(350);

    const getCalls = vi.mocked(fetchWrapper.get).mock.calls.map(([url]) => String(url));
    expect(getCalls.some((url) => url.includes('/clients?search=bur&limit=25'))).toBe(true);
    expect(getCalls.some((url) => url.includes('/clinics?search=clinic+a&limit=25'))).toBe(true);
  });
});
