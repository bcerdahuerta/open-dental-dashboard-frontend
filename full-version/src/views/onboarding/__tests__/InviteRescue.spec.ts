import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h, type PropType } from 'vue';

import InviteRescue from '@/views/onboarding/InviteRescue.vue';
import { router as appRouter } from '@/router';
import { OnboardingPublicHttpError } from '@/types/onboarding';
import type { OnboardingRedemption } from '@/types/onboarding';

const api = vi.hoisted(() => ({
  mintDraft: vi.fn(),
  mintInvite: vi.fn(),
  redeem: vi.fn(),
  submit: vi.fn(),
  getSopVersion: vi.fn()
}));

vi.mock('@/api/onboarding', () => ({ onboardingApi: api }));

const TOKEN = 'invite-token-1';

const redemption: OnboardingRedemption = {
  client_id: 'client-a',
  purpose: 'onboarding-draft-v1',
  expires_at: '2026-09-24T00:00:00Z',
  ttl_seconds: 604800,
  diagnostics: []
};

const submission = {
  client_id: 'client-a',
  version: { version_id: 'version-a', version_number: 1, state: 'DRAFT' as const },
  receipt: {
    version_id: 'version-a',
    state: 'DRAFT' as const,
    digest: 'sha256:submitted',
    canonical_bytes: '{"draft_version":"workflow-builder-onboarding-draft-v1"}',
    etag: '"etag-a"',
    http_status: 201
  },
  diagnostics: []
};

function stubs() {
  return {
    VTextField: {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
    },
    VSelect: defineComponent({
      props: {
        modelValue: { type: [String, Array] as PropType<string | string[]>, default: '' },
        items: { type: Array, default: () => [] },
        itemTitle: { type: String, default: 'title' },
        itemValue: { type: String, default: 'value' }
      },
      emits: ['update:modelValue'],
      setup(selectProps, { attrs, emit }) {
        return () => {
          const options = (selectProps.items as unknown[]).map((item) =>
            item !== null && typeof item === 'object'
              ? {
                  title: String((item as Record<string, unknown>)[selectProps.itemTitle] ?? ''),
                  value: String((item as Record<string, unknown>)[selectProps.itemValue] ?? '')
                }
              : { title: String(item), value: String(item) }
          );
          return h(
            'select',
            {
              ...attrs,
              value: selectProps.modelValue,
              onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value)
            },
            options.map((option) => h('option', { key: option.value, value: option.value }, option.title))
          );
        };
      }
    })
  };
}

async function mountRescue() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/o/:id', component: InviteRescue }] });
  await router.push('/o/client-a');
  await router.isReady();
  window.location.hash = `#${TOKEN}`;
  const wrapper = mount(RouterView, { global: { plugins: [router], stubs: stubs() } });
  await flushPromises();
  return { wrapper, router };
}

describe('Onboarding invite rescue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    sessionStorage.clear();
    api.redeem.mockResolvedValue(redemption);
  });

  it('T04 reads the token from the fragment only and renders the form after redemption', async () => {
    const { wrapper, router } = await mountRescue();

    expect(api.redeem).toHaveBeenCalledWith(TOKEN);
    expect(router.currentRoute.value.query).toEqual({});
    expect(router.currentRoute.value.fullPath).toBe('/o/client-a');
    expect(window.location.search).not.toContain(TOKEN);
    expect(wrapper.find('[data-test="rescue-form"]').exists()).toBe(true);
  });

  it('T05 renders one closed error and no form for an invalid invite without retrying', async () => {
    api.redeem.mockRejectedValue(
      new OnboardingPublicHttpError(401, 'INVITE_INVALID', 'This onboarding link is not valid. Ask your administrator for a new link.')
    );
    const { wrapper } = await mountRescue();

    expect(wrapper.get('[data-test="rescue-error"]').text()).toContain('is not valid');
    expect(wrapper.find('[data-test="rescue-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="rescue-receipt"]').exists()).toBe(false);
    expect(api.redeem).toHaveBeenCalledTimes(1);
  });

  it('T06 submits the closed choices and renders the receipt with the version identity', async () => {
    api.submit.mockResolvedValue(submission);
    const { wrapper } = await mountRescue();
    await wrapper.get('[data-test="rescue-submit"]').trigger('click');
    await flushPromises();

    expect(api.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-a',
        token: TOKEN,
        draft: expect.objectContaining({ archetype_key: 'basic-verification@1' })
      })
    );
    expect(wrapper.get('[data-test="rescue-receipt"]').text()).toContain(
      'Your choices were sent. Your administrator reviews them before anything starts.'
    );
    expect(wrapper.get('[data-test="rescue-receipt"]').text()).not.toContain('version-a');
    expect(wrapper.find('[data-test="rescue-form"]').exists()).toBe(false);
  });

  it('T09 keeps the rescue public while the composer and SOP routes demand a session', async () => {
    localStorage.clear();
    setActivePinia(createPinia());

    await appRouter.push('/o/abc');
    expect(appRouter.currentRoute.value.path).toBe('/o/abc');

    await appRouter.push('/admin/onboarding');
    await flushPromises();
    expect(appRouter.currentRoute.value.path).toBe('/login');
    expect(appRouter.currentRoute.value.query.redirect ?? '/admin/onboarding').toBe('/admin/onboarding');

    await appRouter.push('/admin/onboarding/versions/client-a/version-a');
    await flushPromises();
    expect(appRouter.currentRoute.value.path).toBe('/login');
  });

  it('T11 keeps the invite token in page memory with zero storage writes', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    api.submit.mockResolvedValue(submission);
    const { wrapper, router } = await mountRescue();
    await wrapper.get('[data-test="rescue-submit"]').trigger('click');
    await flushPromises();

    expect(setItem.mock.calls.map((call) => String(call[1])).some((value) => value.includes(TOKEN))).toBe(false);
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain(TOKEN);
    expect(JSON.stringify(Object.entries(sessionStorage))).not.toContain(TOKEN);
    // The fragment is the delivered channel; the token never reaches the path or query.
    expect(window.location.pathname).not.toContain(TOKEN);
    expect(window.location.search).not.toContain(TOKEN);
    expect(router.currentRoute.value.fullPath).not.toContain(TOKEN);
    expect(router.currentRoute.value.query).toEqual({});
    setItem.mockRestore();
  });
});
