import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';

import SopVersionView from '@/views/onboarding/SopVersionView.vue';
import type { OnboardingSopProjection } from '@/types/onboarding';

const api = vi.hoisted(() => ({
  mintDraft: vi.fn(),
  mintInvite: vi.fn(),
  redeem: vi.fn(),
  submit: vi.fn(),
  getSopVersion: vi.fn()
}));

vi.mock('@/api/onboarding', () => ({ onboardingApi: api }));

const sop: OnboardingSopProjection = {
  sop_version: 'onboarding-sop-v1',
  client_id: 'client-a',
  version: { version_id: 'version-a', version_number: 1, blueprint_id: 'blueprint-a', state: 'DRAFT' },
  submitted_choices: {
    archetype_key: 'basic-verification@1',
    optional_notes: ['plan-note'],
    removed_notes: [],
    fbd_scope: 'BY_PLAN',
    elg_window_days: 30,
    cross_year_mode: 'WINDOW_ONLY'
  },
  materialization: {
    selected_atom_keys: ['appointment-note', 'plan-note'],
    locked_atom_keys: ['appointment-note'],
    expansion_trace: [{ source_key: 'existing-plan-benefits-sync@1', added_atom_keys: ['event-commlog'] }],
    profile_digest: 'sha256:profile'
  },
  receipt: {
    version_id: 'version-a',
    state: 'DRAFT',
    digest: 'sha256:submitted',
    canonical_bytes: '{"draft_version":"workflow-builder-onboarding-draft-v1"}',
    actor_user_id: 'user-a',
    created_at: '2026-09-17T00:00:00Z',
    receipt_created_at: '2026-09-17T00:01:00Z'
  }
};

function response(data: unknown) {
  return { data, status: 200, etag: '"etag-a"', headers: new Headers() };
}

async function mountSop() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/onboarding/versions/:clientId/:versionId', component: SopVersionView }]
  });
  await router.push('/admin/onboarding/versions/client-a/version-a');
  await router.isReady();
  const wrapper = mount(RouterView, {
    global: {
      plugins: [router],
      stubs: { UiParentCard: { template: '<section><slot name="action" /><slot /></section>' }, BaseBreadcrumb: true }
    }
  });
  await flushPromises();
  return wrapper;
}

describe('Onboarding SOP double-check', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.getSopVersion.mockResolvedValue(response({ sop, diagnostics: [] }));
  });

  it('T07 renders the submitted choices, the assembly trace, and the receipt', async () => {
    const wrapper = await mountSop();

    expect(api.getSopVersion).toHaveBeenCalledWith('client-a', 'version-a');
    expect(wrapper.get('[data-test="sop-choices"]').text()).toContain('Basic verification');
    expect(wrapper.get('[data-test="sop-choices"]').text()).toContain('Plan note');
    expect(wrapper.get('[data-test="sop-choices"]').text()).toContain('ELG window');
    expect(wrapper.get('[data-test="sop-trace"]').text()).toContain('Existing plan benefits sync');
    expect(wrapper.get('[data-test="sop-capabilities"]').text()).toContain('Appointment note');
    expect(wrapper.get('[data-test="sop-capabilities"]').text()).toContain('Required and locked');
    expect(wrapper.get('[data-test="sop-receipt"]').text()).toContain('version-a');
    expect(wrapper.get('[data-test="sop-receipt"]').text()).toContain('user-a');
    expect(wrapper.find('[data-test="sop-error"]').exists()).toBe(false);
  });

  it('T08 keeps the rendered operator copy in the closed client vocabulary', async () => {
    const wrapper = await mountSop();
    const rendered = wrapper.text().toLowerCase();

    for (const internal of ['bookmark', 'digest', 'etag', 'atom_key', 'carrier']) {
      expect(rendered).not.toContain(internal);
    }
    expect(rendered).not.toContain('plan-note');
  });
});
