import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import ClientList from '@/views/admin/ClientList.vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import sidebarItem, { type menu } from '@/layouts/full/vertical-sidebar/sidebarItem';

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}));

const InviteClientDialogStub = defineComponent({
  name: 'InviteClientDialog',
  props: { modelValue: { type: Boolean, default: false } },
  emits: ['update:modelValue', 'client-created'],
  template: '<div v-if="modelValue" data-test="invite-dialog-open" />'
});

function mountClientList() {
  return mount(ClientList, {
    global: {
      stubs: {
        BaseBreadcrumb: { template: '<nav />' },
        UiParentCard: { props: ['title'], template: '<section><h2>{{ title }}</h2><slot name="action" /><slot /></section>' },
        RouterLink: true,
        InviteClientDialog: InviteClientDialogStub
      }
    }
  });
}

describe('ClientList client automations placement', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchWrapper.get).mockResolvedValue([]);
  });

  it('renders the internal client automations panel inside client management without a sidebar route', async () => {
    const wrapper = mountClientList();

    await flushPromises();

    expect(wrapper.findComponent({ name: 'ClientAutomationsPanel' }).exists()).toBe(true);
    expect(wrapper.get('[data-test="clients-new-client"]').text()).toContain('New client');
    expect(wrapper.get('[data-test="clients-new-client"]').text()).not.toContain('Invite client');
    expect(wrapper.text()).toContain('Client Automations');
    expect(wrapper.text()).toContain('Rules');
    expect(wrapper.text()).toContain('Recent Runs');
  });

  it('opens the client creation dialog in place instead of navigating away', async () => {
    const wrapper = mountClientList();
    await flushPromises();

    expect(wrapper.find('[data-test="invite-dialog-open"]').exists()).toBe(false);

    await wrapper.get('[data-test="clients-new-client"]').trigger('click');

    expect(wrapper.find('[data-test="invite-dialog-open"]').exists()).toBe(true);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('refreshes the client list after the dialog reports a created client', async () => {
    const wrapper = mountClientList();
    await flushPromises();
    const callsBefore = vi.mocked(fetchWrapper.get).mock.calls.length;

    await wrapper.get('[data-test="clients-new-client"]').trigger('click');
    wrapper.findComponent(InviteClientDialogStub).vm.$emit('client-created', 'client-new');
    await flushPromises();

    expect(vi.mocked(fetchWrapper.get).mock.calls.length).toBe(callsBefore + 1);
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
