import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';

import PipelineStepsTab from '@/views/admin/clinic-config/PipelineStepsTab.vue';

const profilesRef = ref([
  { id: 'profile-1', profile_name: 'FBD Active', is_default: true, verification_type: 'FBD', target_status: 'Active' }
]);

const stepsRef = ref([
  {
    id: 'step-1',
    step_type: 'create_commlog',
    step_order: 1,
    on_failure: 'HALT',
    is_enabled: true,
    step_config: { comm_type_def_num: 123 },
    run_condition: null
  }
]);

const effectivePipelinesRef = ref<Record<string, unknown>[]>([]);

const clinicStoreMock = {
  fetchProfiles: vi.fn(async () => profilesRef.value),
  fetchProfileSteps: vi.fn(async () => stepsRef.value),
  fetchPipelineStepTypes: vi.fn(async () => ['plan_matching', 'create_commlog', 'render_note']),
  saveProfileSteps: vi.fn(async (_profileId: string, payload: unknown[]) => payload),
  createProfile: vi.fn(),
  fetchEffectivePipelines: vi.fn(async () => ({ effective_pipelines: effectivePipelinesRef.value })),
  effectivePipelines: effectivePipelinesRef
};

vi.mock('@/stores/clinics', () => ({
  useClinicStore: () => clinicStoreMock
}));

describe('PipelineStepsTab effective pipeline view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    profilesRef.value = [];
    stepsRef.value = [];
    effectivePipelinesRef.value = [];
  });

  function mountView() {
    return mount(PipelineStepsTab, {
      props: { clinicId: 'clinic-1', clientId: 'client-1' },
      global: {
        stubs: {
          InfoCircleIcon: true,
          PlusIcon: true,
          SaveIcon: true,
          EditIcon: true,
          SettingsIcon: true,
          ToggleLeftIcon: true,
          TrashIcon: true,
          CheckIcon: true,
          XIcon: true,
          VSelect: {
            props: {
              modelValue: { type: [String, Number, Boolean, Object, Array], default: null },
              items: { type: Array, default: () => [] }
            },
            template: `<div class="v-select-probe" :data-items="items.join('|')"><slot /></div>`
          },
          VSnackbar: { template: '<div><slot /></div>' },
          VDialog: { template: '<div class="v-dialog-stub"></div>' },
          'v-code': { template: '<pre><slot /></pre>' }
        }
      }
    });
  }

  it('shows read-only effective pipeline when no legacy profiles exist', async () => {
    profilesRef.value = [];
    effectivePipelinesRef.value = [
      {
        source: 'client_assignment',
        source_id: 'assign-1',
        verification_type: 'ELG',
        target_statuses: ['Active'],
        precedence: 1,
        context_rules: {},
        base_profile: { id: 'bp-1', profile_name: 'DR Basic Writeback', verification_type: 'ELG', target_status: 'Active', is_base: true },
        steps: [{ step_order: 1, step_type: 'plan_matching', step_config: {}, is_enabled: true, on_failure: 'HALT', run_condition: null }]
      }
    ];

    const wrapper = mountView();
    await nextTick();
    await nextTick();

    expect(clinicStoreMock.fetchEffectivePipelines).toHaveBeenCalledWith('clinic-1');

    const html = wrapper.html();
    expect(html).toContain('DR Basic Writeback');
    expect(html).toContain('Client Assignment');
    expect(html).toContain('plan_matching');
  });

  it('hides editable controls in read-only effective mode', async () => {
    profilesRef.value = [];
    effectivePipelinesRef.value = [
      {
        source: 'client_assignment',
        source_id: 'assign-1',
        verification_type: 'ELG',
        target_statuses: ['Active'],
        precedence: 1,
        context_rules: {},
        base_profile: { id: 'bp-1', profile_name: 'DR Basic Writeback', verification_type: 'ELG', target_status: 'Active', is_base: true },
        steps: [{ step_order: 1, step_type: 'plan_matching', step_config: {}, is_enabled: true, on_failure: 'HALT', run_condition: null }]
      }
    ];

    const wrapper = mountView();
    await nextTick();
    await nextTick();

    const html = wrapper.html();
    expect(html).not.toContain('Add Step');
    expect(html).not.toContain('Save Steps');
    expect(html).not.toContain('Load Default Profiles');
    // User-observable: no legacy control buttons are rendered in the DOM (dialogs are stubbed separately)
    const allButtons = wrapper.findAll('button');
    const legacyButtonTexts = allButtons.map((b) => b.text());
    expect(legacyButtonTexts).not.toContain('New Profile');
    expect(legacyButtonTexts).not.toContain('Load Default Profiles');
  });

  it('shows editable legacy UI when legacy profiles exist', async () => {
    profilesRef.value = [
      { id: 'profile-1', profile_name: 'FBD Active', is_default: true, verification_type: 'FBD', target_status: 'Active' }
    ];
    effectivePipelinesRef.value = [];

    const wrapper = mountView();
    await nextTick();
    await nextTick();

    const html = wrapper.html();
    expect(html).toContain('New Profile');
  });

  it('shows info banner when both legacy profiles and effective pipelines exist', async () => {
    profilesRef.value = [
      { id: 'profile-1', profile_name: 'FBD Active', is_default: true, verification_type: 'FBD', target_status: 'Active' }
    ];
    effectivePipelinesRef.value = [
      {
        source: 'client_assignment',
        source_id: 'assign-1',
        verification_type: 'ELG',
        target_statuses: ['Active'],
        precedence: 1,
        context_rules: {},
        base_profile: { id: 'bp-1', profile_name: 'DR Basic Writeback', verification_type: 'ELG', target_status: 'Active', is_base: true },
        steps: []
      }
    ];

    const wrapper = mountView();
    await nextTick();
    await nextTick();

    const html = wrapper.html();
    expect(html).toContain('Effective pipeline configuration is also active');
  });

  it('shows empty effective state when neither legacy nor effective pipelines exist', async () => {
    profilesRef.value = [];
    effectivePipelinesRef.value = [];

    const wrapper = mountView();
    await nextTick();
    await nextTick();

    const html = wrapper.html();
    expect(html).toContain('No effective pipeline configured');
  });
});
