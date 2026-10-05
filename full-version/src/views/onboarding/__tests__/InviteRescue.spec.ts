import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import InviteRescue from '@/views/onboarding/InviteRescue.vue';
import { router as appRouter } from '@/router';
import { OnboardingPublicHttpError } from '@/types/onboarding';

const api = vi.hoisted(() => ({ redeem: vi.fn(), readSetup: vi.fn(), fetchSetupQuestions: vi.fn(), saveSetup: vi.fn(), submit: vi.fn(), mintSetup: vi.fn() }));
vi.mock('@/api/onboarding', () => ({ onboardingApi: api }));
const TOKEN = 'synthetic-legacy-fragment';
const mounted: VueWrapper[] = [];
async function mountRescue() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/o/:id', component: InviteRescue }] });
  await router.push('/o/client-a');
  window.history.replaceState({}, '', `#${TOKEN}`);
  const wrapper = mount(InviteRescue, { global: { plugins: [router] } }); mounted.push(wrapper);
  await flushPromises(); return { wrapper, router };
}

describe('Public setup link boundary', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear();
    api.redeem.mockResolvedValue({ client_id: 'client-a', purpose: 'onboarding-draft-v1', expires_at: '2026-01-01', ttl_seconds: 100, diagnostics: [] });
  });
  afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); });

  it('legacy client-only links require renewal without a save or opportunistic setup creation', async () => {
    const { wrapper, router } = await mountRescue();
    expect(api.redeem).toHaveBeenCalledWith(TOKEN);
    expect(wrapper.get('[data-test="renewal-needed"]').text()).toContain('needs to be renewed');
    expect(wrapper.find('[data-test="extraction-save"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="rescue-form"]').exists()).toBe(false);
    expect(api.readSetup).not.toHaveBeenCalled(); expect(api.mintSetup).not.toHaveBeenCalled();
    expect(api.saveSetup).not.toHaveBeenCalled(); expect(api.submit).not.toHaveBeenCalled();
    expect(router.currentRoute.value.query).toEqual({}); expect(window.location.search).not.toContain(TOKEN);
  });

  it('invalid and expired tokens show the closed error without retry or false success', async () => {
    api.redeem.mockRejectedValue(new OnboardingPublicHttpError(401, 'INVITE_EXPIRED', 'This onboarding link has expired. Ask your administrator for a new link.'));
    const { wrapper } = await mountRescue();
    expect(wrapper.get('[data-test="rescue-error"]').text()).toContain('expired');
    expect(api.redeem).toHaveBeenCalledTimes(1); expect(api.readSetup).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="extraction-saved"]').exists()).toBe(false);
  });

  it('rejects another client entry and does not read progress for it', async () => {
    api.redeem.mockResolvedValue({ client_id: 'client-b', setup_id: 'setup-b' });
    const { wrapper } = await mountRescue();
    expect(wrapper.get('[data-test="rescue-error"]').text()).toContain('cannot be used'); expect(api.readSetup).not.toHaveBeenCalled();
  });

  it('missing setup/read never silently falls back to fake saved state', async () => {
    api.redeem.mockResolvedValue({ client_id: 'client-a', setup_id: 'setup-a' });
    api.readSetup.mockResolvedValue(undefined);
    const { wrapper } = await mountRescue();
    expect(wrapper.get('[data-test="rescue-error"]').text()).toContain('could not load');
    expect(wrapper.find('[data-test="extraction-start"]').exists()).toBe(false);
    expect(api.submit).not.toHaveBeenCalled();
  });

  it('keeps public rescue accessible while operator routes require a session', async () => {
    await appRouter.push('/o/abc'); expect(appRouter.currentRoute.value.path).toBe('/o/abc');
    await appRouter.push('/admin/onboarding'); await flushPromises(); expect(appRouter.currentRoute.value.path).toBe('/login');
    await appRouter.push('/admin/onboarding/versions/client-a/version-a'); await flushPromises(); expect(appRouter.currentRoute.value.path).toBe('/login');
  });

  it('keeps legacy token out of storage and clears no unrelated stored values', async () => {
    localStorage.setItem('unrelated', 'keep');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const { router } = await mountRescue();
    expect(storage).not.toHaveBeenCalled(); expect(localStorage.getItem('unrelated')).toBe('keep');
    expect(window.location.pathname).not.toContain(TOKEN); expect(router.currentRoute.value.fullPath).not.toContain(TOKEN);
    storage.mockRestore();
  });
});
