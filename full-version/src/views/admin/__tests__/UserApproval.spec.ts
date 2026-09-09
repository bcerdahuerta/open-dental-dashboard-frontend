import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { VCheckbox } from 'vuetify/components';
import UserApproval from '@/views/admin/UserApproval.vue';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/utils/helpers/fetch-wrapper', () => ({ fetchWrapper: api }));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { id: 'admin' } }) }));

const pending = { id: 'pending', email: 'pending@example.test', status: 'PENDING', allowed_products: [] };
let wrapper: ReturnType<typeof mount>;

async function openApproval() {
  wrapper = mount(UserApproval, {
    global: {
      stubs: {
        UiParentCard: { template: '<section><slot /></section>' },
        VSnackbar: { props: ['modelValue'], template: '<div v-if="modelValue" role="alert"><slot /></div>' }
      }
    }
  });
  await flushPromises();
  return wrapper.findAllComponents(VCheckbox);
}

async function approve() {
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Approve')!
    .trigger('click');
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (url: string) => (url.endsWith('/pending') ? [pending] : []));
  api.post.mockResolvedValue({});
});
afterEach(() => wrapper?.unmount());

describe('User approval product selection', () => {
  it('initializes the checkbox group as an explicit multiple array', async () => {
    const checkboxes = await openApproval();
    expect(checkboxes).toHaveLength(3);
    for (const checkbox of checkboxes) {
      expect(checkbox.props('modelValue')).toEqual([]);
      expect(checkbox.props('multiple')).toBe(true);
    }
  });

  it.each([
    ['writeback', 1],
    ['extraction', 2]
  ] as const)('sends %s as a one-item array', async (product, index) => {
    const checkboxes = await openApproval();
    await checkboxes[index].find('input').setValue(true);
    await approve();
    expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/users/pending/approve'), { product_types: [product] });
  });

  it('preserves multiple selections and deselection', async () => {
    const checkboxes = await openApproval();
    await checkboxes[1].find('input').setValue(true);
    await checkboxes[2].find('input').setValue(true);
    await approve();
    expect(api.post).toHaveBeenLastCalledWith(expect.any(String), { product_types: ['writeback', 'extraction'] });
    await checkboxes[1].find('input').setValue(false);
    await approve();
    expect(api.post).toHaveBeenLastCalledWith(expect.any(String), { product_types: ['extraction'] });
  });

  it('omits empty selections to preserve backend defaults', async () => {
    const checkboxes = await openApproval();
    await approve();
    expect(api.post).toHaveBeenLastCalledWith(expect.any(String), {});
    await checkboxes[1].find('input').setValue(true);
    await checkboxes[1].find('input').setValue(false);
    await approve();
    expect(api.post).toHaveBeenLastCalledWith(expect.any(String), {});
  });

  it.each(['Invalid product selection', new Error('Invalid product selection'), null])(
    'displays safe approval errors: %s',
    async (error) => {
      await openApproval();
      api.post.mockRejectedValueOnce(error);
      await approve();
      expect(wrapper.text()).toContain(error === null ? 'Failed to approve user' : 'Invalid product selection');
    }
  );
});
