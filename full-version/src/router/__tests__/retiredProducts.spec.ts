import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { VCheckbox } from 'vuetify/components';
import ProductsTab from '@/views/admin/clinic-config/ProductsTab.vue';
import UserApproval from '@/views/admin/UserApproval.vue';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), fetchEnrollments: vi.fn(),
  hasProduct: vi.fn(), beforeEach: vi.fn()
}));
vi.mock('@/utils/helpers/fetch-wrapper', () => ({ fetchWrapper: { get: mocks.get, post: mocks.post } }));
vi.mock('@/stores/clinics', () => ({ useClinicStore: () => ({
  enrollments: [], fetchEnrollments: mocks.fetchEnrollments
}) }));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({
  user: { id: 'admin' }, hasProduct: mocks.hasProduct
}) }));
vi.mock('vue-router', () => ({
  createWebHistory: vi.fn(), createRouter: () => ({ beforeEach: mocks.beforeEach })
}));

let wrapper: ReturnType<typeof mount>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockImplementation(async (url: string) => url.endsWith('/pending')
    ? [{ id: 'pending', email: 'pending@example.test', status: 'PENDING', allowed_products: [] }] : []);
  mocks.fetchEnrollments.mockResolvedValue([]);
});
afterEach(() => wrapper?.unmount());

describe('Retired credit product entrypoints', () => {
  it('does not offer credit enrollment but retains writeback', async () => {
    wrapper = mount(ProductsTab, { props: { clinicId: 'clinic-1' } });
    await flushPromises();
    expect(mocks.fetchEnrollments).toHaveBeenCalledWith('clinic-1');
    expect(wrapper.text()).not.toContain('Credit Analysis');
    expect(wrapper.text()).toContain('Insurance Writeback');
  });

  it('only offers active products for admin approval', async () => {
    wrapper = mount(UserApproval, { global: { stubs: {
      UiParentCard: { template: '<section><slot /></section>' }
    } } });
    await flushPromises();
    const values = wrapper.findAllComponents(VCheckbox).map((checkbox) => checkbox.props('value'));
    expect(values).toEqual(['writeback', 'extraction']);
  });

  it.each([
    [['credit'], '/login'],
    [['credit', 'extraction'], '/main/extraction'],
    [['writeback', 'extraction'], '/dashboard/default']
  ])('lands users with %j on an active destination %s', async (products, destination) => {
    vi.resetModules();
    mocks.hasProduct.mockImplementation((product: string) => products.includes(product));
    await import('@/router/index');
    const guard = mocks.beforeEach.mock.calls[0][0];
    const next = vi.fn();
    await guard({ path: '/login', matched: [], meta: {} }, {}, next);
    expect(next).toHaveBeenCalledWith(destination);
  });
});
