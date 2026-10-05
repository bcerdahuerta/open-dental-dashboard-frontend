import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h, type PropType } from 'vue';

import OnboardingComposer from '@/views/onboarding/OnboardingComposer.vue';
import sidebarItem from '@/layouts/full/vertical-sidebar/sidebarItem';
import { useClientStore, type ClientItem } from '@/stores/clients';
import type { OnboardingDraftProjection } from '@/types/onboarding';

const api = vi.hoisted(() => ({
  mintDraft: vi.fn(),
  mintInvite: vi.fn(),
  mintSetup: vi.fn(),
  listSetups: vi.fn(),
  redeem: vi.fn(),
  submit: vi.fn(),
  getSopVersion: vi.fn()
}));

vi.mock('@/api/onboarding', () => ({ onboardingApi: api }));

const clientFixtures: ClientItem[] = [
  {
    id: 'client-a',
    client_name: 'Client A',
    product_type: 'Standard',
    is_active: true,
    slack_webhook: null,
    slack_qa_ids: null,
    days_in_advance: 3,
    created_at: '2026-09-17T00:00:00.000000Z',
    updated_at: '2026-09-17T00:00:00.000000Z'
  }
];

const admittedDraft: OnboardingDraftProjection = {
  lifecycle: 'DRAFT',
  activatable: false,
  candidate: {
    lifecycle: 'DRAFT',
    selected_atom_keys: ['appointment-note', 'plan-note'],
    locked_atom_keys: ['appointment-note'],
    expansion_trace: [],
    capability_states: { 'appointment-note': 'REQUIRED', 'plan-note': 'OPTIONAL' },
    dependencies: []
  },
  profile: { fbd_scope: 'BY_PLAN', elg_window_days: 30, cross_year_mode: 'WINDOW_ONLY' },
  client_choices: {
    archetype_key: 'basic-verification@1',
    optional_notes: ['plan-note'],
    removed_notes: [],
    fbd_scope: 'BY_PLAN',
    elg_window_days: 30,
    cross_year_mode: 'WINDOW_ONLY'
  }
};

function response(data: unknown, etag = '"etag-a"') {
  return { data, status: 200, etag, headers: new Headers() };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify({ data: payload }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function stubs() {
  return {
    UiParentCard: { template: '<section><slot name="action" /><slot /></section>' },
    BaseBreadcrumb: true,
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

async function mountComposer() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: OnboardingComposer }] });
  await router.push('/');
  await router.isReady();
  const wrapper = mount(RouterView, { global: { plugins: [router], stubs: stubs() } });
  await flushPromises();
  return wrapper;
}

async function selectClient(wrapper: Awaited<ReturnType<typeof mountComposer>>) {
  await wrapper.get('[data-test="composer-client"]').setValue('client-a');
  await flushPromises();
}

describe('Onboarding composer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    api.listSetups.mockResolvedValue(response({ setups: [], has_more: false, next_after_setup_id: null }));
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse([...clientFixtures, { ...clientFixtures[0], id: 'client-b', client_name: 'Client B' }]))
    );
    useClientStore().clients = [...clientFixtures, { ...clientFixtures[0], id: 'client-b', client_name: 'Client B' }];
  });

  it('T01 renders the closed client vocabulary and never the internal authoring names', async () => {
    const wrapper = await mountComposer();
    await selectClient(wrapper);

    const text = wrapper.text();
    const lowered = text.toLowerCase();
    expect(wrapper.get('[data-test="composer-invite-client"]').text()).toBe('New client');
    expect(lowered).toContain('basic verification');
    expect(lowered).toContain('verification with benefits sync');
    expect(lowered).toContain('plan note');
    expect(lowered).toContain('fbd by plan');
    expect(lowered).toContain('elg window only');
    for (const internal of ['plan-note', 'subscriber-note', 'event-commlog', 'atom_key', 'digest', 'etag', 'bookmark', 'carrier']) {
      expect(lowered).not.toContain(internal);
    }
  });

  it('T02 emits the closed draft request and renders the admitted receipt', async () => {
    api.mintDraft.mockResolvedValue(
      response({
        draft: admittedDraft,
        canonical_bytes: '{"draft_version":"workflow-builder-onboarding-draft-v1"}',
        digest: 'sha256:draft',
        diagnostics: []
      })
    );
    const wrapper = await mountComposer();
    await selectClient(wrapper);
    await wrapper.get('[data-test="composer-note-include-plan-note"]').trigger('click');
    await wrapper.get('[data-test="composer-mint-draft"]').trigger('click');
    await flushPromises();

    expect(api.mintDraft).toHaveBeenCalledWith(
      'client-a',
      {
        archetype_key: 'basic-verification@1',
        optional_notes: ['plan-note'],
        removed_notes: [],
        fbd_scope: 'BY_PLAN',
        elg_window_days: 30,
        cross_year_mode: 'WINDOW_ONLY'
      },
      expect.any(AbortSignal)
    );
    expect(wrapper.get('[data-test="composer-receipt"]').text()).toContain('Draft receipt');
    expect(wrapper.get('[data-test="composer-draft"]').text()).toContain('Draft');
  });

  it('T03 mints the short rescue link with the token only after the fragment', async () => {
    api.mintSetup.mockResolvedValue(
      response({ setup_id: 'setup-a', link: 'https://api.example.test/onboarding-invite#invite-token-9', expires_at: '2026-09-24T00:00:00Z', expires_days: 7 })
    );
    const wrapper = await mountComposer();
    await selectClient(wrapper);
    await wrapper.get('[data-test="composer-new-setup"]').trigger('click');
    await flushPromises();

    const link = wrapper.get('[data-test="composer-invite-link"]').text();
    expect(link).toBe(`${window.location.origin}/o/client-a#invite-token-9`);
    expect(api.mintSetup).toHaveBeenCalledWith('client-a', undefined);
    expect(api.mintInvite).not.toHaveBeenCalled();
    expect(JSON.stringify(api.mintSetup.mock.calls)).not.toContain('invite-token-9');
    expect(JSON.stringify(api.mintDraft.mock.calls)).not.toContain('invite-token-9');
    expect(window.location.href).not.toContain('invite-token-9');
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain('invite-token-9');
    expect(JSON.stringify(Object.entries(sessionStorage))).not.toContain('invite-token-9');
  });

  it('lists metadata with no latest selection and renews only an explicit selection after returning', async () => {
    api.listSetups.mockResolvedValue(response({ setups: [{ setup_id: 'setup-old', revision: 4, created_at: '2026-01-02T12:00:00Z', updated_at: '2026-02-03T13:00:00Z' }], has_more: false, next_after_setup_id: null }));
    api.mintSetup.mockResolvedValue(response({ setup_id: 'setup-old', link: 'https://example.test/#synthetic-token', expires_at: '2026-09-24', expires_days: 7 }));
    const first = await mountComposer(); await selectClient(first); first.unmount();
    const wrapper = await mountComposer(); await selectClient(wrapper);
    expect(api.listSetups).toHaveBeenCalledWith('client-a', undefined);
    expect(wrapper.text()).not.toContain('setup-old');
    expect(wrapper.text()).toContain('2026');
    expect((wrapper.get('[data-test="composer-saved-setup"]').element as HTMLSelectElement).value).toBe('');
    expect(wrapper.get('[data-test="composer-renew-setup"]').attributes('disabled')).toBeDefined();
    expect(api.mintSetup).not.toHaveBeenCalled();
    await wrapper.get('[data-test="composer-saved-setup"]').setValue('setup-old');
    await wrapper.get('[data-test="composer-renew-setup"]').trigger('click'); await flushPromises();
    expect(api.mintSetup).toHaveBeenCalledWith('client-a', 'setup-old');
    expect(api.submit).not.toHaveBeenCalled();
  });

  it('loads further fixed-size pages only on request and clears selection on refresh', async () => {
    api.listSetups.mockResolvedValueOnce(response({ setups: Array.from({ length: 25 }, (_, index) => ({ setup_id: index === 24 ? 'setup-first' : `setup-page-${index}`, revision: 1, created_at: '2026-01-01', updated_at: '2026-01-01' })), has_more: true, next_after_setup_id: 'setup-first' }))
      .mockResolvedValueOnce(response({ setups: [{ setup_id: 'setup-second', revision: 2, created_at: '2026-01-02', updated_at: '2026-01-03' }], has_more: false, next_after_setup_id: null }));
    const wrapper = await mountComposer(); await selectClient(wrapper);
    expect(api.listSetups).toHaveBeenCalledTimes(1);
    await wrapper.get('[data-test="composer-setups-more"]').trigger('click'); await flushPromises();
    expect(api.listSetups.mock.calls[1]).toEqual(['client-a', 'setup-first']);
    expect(wrapper.get('[data-test="composer-saved-setup"]').findAll('option')).toHaveLength(27);
    await wrapper.get('[data-test="composer-saved-setup"]').setValue('setup-second');
    await wrapper.get('[data-test="composer-setups-refresh"]').trigger('click'); await flushPromises();
    expect(wrapper.get('[data-test="composer-renew-setup"]').attributes('disabled')).toBeDefined();
    expect(api.listSetups.mock.calls[2]).toEqual(['client-a', undefined]);
  });

  it('ignores stale pages and clears old identities/links across clients, including foreign selection', async () => {
    let resolve!: (value: unknown) => void;
    api.listSetups.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const wrapper = await mountComposer(); await selectClient(wrapper);
    await wrapper.get('[data-test="composer-client"]').setValue('client-b'); await flushPromises();
    expect(api.listSetups.mock.calls[1]).toEqual(['client-b', undefined]);
    resolve(response({ setups: [{ setup_id: 'stale', revision: 1, created_at: '2026-01-01', updated_at: '2026-01-01' }], has_more: true, next_after_setup_id: 'stale' })); await flushPromises();
    expect(wrapper.get('[data-test="composer-saved-setup"]').findAll('option')).toHaveLength(1);
    const select = wrapper.get('[data-test="composer-saved-setup"]');
    const forged = document.createElement('option'); forged.value = 'foreign'; select.element.appendChild(forged);
    await select.setValue('foreign');
    await wrapper.get('[data-test="composer-renew-setup"]').trigger('click'); await flushPromises();
    expect(api.mintSetup).not.toHaveBeenCalled();
  });

  it('starting new setup is distinct from renewal and never sends the selected setup ID', async () => {
    api.listSetups.mockResolvedValue(response({ setups: [{ setup_id: 'existing', revision: 2, created_at: '2026-01-01', updated_at: '2026-01-01' }], has_more: false, next_after_setup_id: null }));
    api.mintSetup.mockResolvedValue(response({ setup_id: 'new', link: 'https://example.test/#synthetic-token', expires_at: '2026-09-24', expires_days: 7 }));
    const wrapper = await mountComposer(); await selectClient(wrapper);
    await wrapper.get('[data-test="composer-saved-setup"]').setValue('existing');
    await wrapper.get('[data-test="composer-new-setup"]').trigger('click'); await flushPromises();
    expect(api.mintSetup).toHaveBeenCalledWith('client-a', undefined);
    expect((wrapper.get('[data-test="composer-saved-setup"]').element as HTMLSelectElement).value).toBe('existing');
  });

  it('ignores a minted link returning after the operator switches clients', async () => {
    let resolve!: (value: unknown) => void;
    api.mintSetup.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const wrapper = await mountComposer(); await selectClient(wrapper);
    await wrapper.get('[data-test="composer-new-setup"]').trigger('click'); await flushPromises();
    await wrapper.get('[data-test="composer-client"]').setValue('client-b'); await flushPromises();
    resolve(response({ setup_id: 'setup-a', link: 'https://example.test/#stale-token', expires_at: '2026-01-01', expires_days: 7 })); await flushPromises();
    expect(wrapper.find('[data-test="composer-invite-link"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="composer-renew-setup"]').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).not.toContain('stale-token');
  });

  it('shows list failure without fake metadata and retries only on explicit refresh', async () => {
    api.listSetups.mockRejectedValueOnce(new Error('offline'));
    const wrapper = await mountComposer(); await selectClient(wrapper);
    expect(wrapper.get('[data-test="composer-setups-error"]').text()).toContain('could not be loaded');
    expect(wrapper.get('[data-test="composer-renew-setup"]').attributes('disabled')).toBeDefined();
    expect(api.listSetups).toHaveBeenCalledTimes(1);
    await wrapper.get('[data-test="composer-setups-refresh"]').trigger('click'); await flushPromises();
    expect(api.listSetups).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-test="composer-setups-error"]').exists()).toBe(false);
  });

  it('list transport sends only client and optional cursor with no invented page-size/progress fields', async () => {
    const actual = await vi.importActual<typeof import('@/api/onboarding')>('@/api/onboarding');
    const { fetchWrapper } = await import('@/utils/helpers/fetch-wrapper');
    const post = vi.spyOn(fetchWrapper, 'post').mockResolvedValue(response({ setups: [], has_more: false, next_after_setup_id: null }));
    await actual.onboardingApi.listSetups('client-a'); await actual.onboardingApi.listSetups('client-a', 'setup-cursor');
    expect(post.mock.calls[0]).toEqual([expect.stringContaining('/workflow-builder/onboarding-invites/setup/list'), { client_id: 'client-a' }, { responseMode: 'metadata' }]);
    expect(post.mock.calls[1][1]).toEqual({ client_id: 'client-a', after_setup_id: 'setup-cursor' });
    post.mockRestore();
  });

  it('T12 blocks a contradictory include and exclude with a visible message', async () => {
    const wrapper = await mountComposer();
    await selectClient(wrapper);
    await wrapper.get('[data-test="composer-note-include-plan-note"]').trigger('click');
    await wrapper.get('[data-test="composer-note-exclude-plan-note"]').trigger('click');

    expect(wrapper.get('[data-test="composer-note-overlap-message"]').text()).toContain('Plan note');
    expect(wrapper.get('[data-test="composer-mint-draft"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-test="composer-mint-draft"]').trigger('click');
    await flushPromises();
    expect(api.mintDraft).not.toHaveBeenCalled();
  });

  it('T10 exposes one authorized admin sidebar entry for the composer', () => {
    const entry = sidebarItem.find((item) => item.to === '/admin/onboarding');
    expect(entry).toBeDefined();
    expect(entry?.title).toBe('Onboarding');
    expect(entry?.requiredRole).toBe('admin');
    expect(sidebarItem.filter((item) => item.to === '/admin/onboarding')).toHaveLength(1);
  });
});
