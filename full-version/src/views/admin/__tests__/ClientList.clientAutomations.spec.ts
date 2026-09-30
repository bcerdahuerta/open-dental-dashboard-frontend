import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import ClientList from '@/views/admin/ClientList.vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import sidebarItem, { type menu } from '@/layouts/full/vertical-sidebar/sidebarItem';

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe('ClientList client automations placement', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchWrapper.get).mockResolvedValue([]);
  });

  it('renders the internal client automations panel inside client management without a sidebar route', async () => {
    const wrapper = mount(ClientList, {
      global: {
        stubs: {
          BaseBreadcrumb: { template: '<nav />' },
          UiParentCard: { props: ['title'], template: '<section><h2>{{ title }}</h2><slot name="action" /><slot /></section>' },
          RouterLink: true
        }
      }
    });

    await flushPromises();

    expect(wrapper.findComponent({ name: 'ClientAutomationsPanel' }).exists()).toBe(true);
    expect(wrapper.get('[data-test="clients-new-client"]').text()).toContain('New client');
    expect(wrapper.get('[data-test="clients-new-client"]').text()).not.toContain('Invite client');
    expect(wrapper.text()).toContain('Client Automations');
    expect(wrapper.text()).toContain('Rules');
    expect(wrapper.text()).toContain('Recent Runs');
  });

  it('does not add Client Automations to the sidebar menu', () => {
    function flatten(items: menu[]): menu[] {
      return items.flatMap((item) => [item, ...(item.children ? flatten(item.children) : [])]);
    }

    const entries = flatten(sidebarItem);
    expect(entries.some((item) => item.title === 'Client Automations')).toBe(false);
    expect(entries.some((item) => item.to === '/admin/client-automations')).toBe(false);
  });
});
