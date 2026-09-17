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
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(clientFixtures))
    );
    useClientStore().clients = clientFixtures;
  });

  it('T01 renders the closed client vocabulary and never the internal authoring names', async () => {
    const wrapper = await mountComposer();
    await selectClient(wrapper);

    const text = wrapper.text();
    const lowered = text.toLowerCase();
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
    api.mintInvite.mockResolvedValue(
      response({ link: 'https://api.example.test/onboarding-invite#invite-token-9', expires_at: '2026-09-24T00:00:00Z', expires_days: 7 })
    );
    const wrapper = await mountComposer();
    await selectClient(wrapper);
    await wrapper.get('[data-test="composer-mint-invite"]').trigger('click');
    await flushPromises();

    const link = wrapper.get('[data-test="composer-invite-link"]').text();
    expect(link).toBe(`${window.location.origin}/o/client-a#invite-token-9`);
    expect(JSON.stringify(api.mintInvite.mock.calls)).not.toContain('invite-token-9');
    expect(JSON.stringify(api.mintDraft.mock.calls)).not.toContain('invite-token-9');
    expect(window.location.href).not.toContain('invite-token-9');
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain('invite-token-9');
    expect(JSON.stringify(Object.entries(sessionStorage))).not.toContain('invite-token-9');
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
