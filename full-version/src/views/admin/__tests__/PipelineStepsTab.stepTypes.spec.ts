import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';

import PipelineStepsTab from '@/views/admin/clinic-config/PipelineStepsTab.vue';

type SaveStepPayload = Array<{ id?: string; step_type: string; step_order: number }>;

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

const clinicStoreMock = {
  fetchProfiles: vi.fn(async () => profilesRef.value),
  fetchProfileSteps: vi.fn(async () => stepsRef.value),
  fetchPipelineStepTypes: vi.fn(async () => ['plan_matching', 'create_commlog', 'render_note']),
  saveProfileSteps: vi.fn(async (_profileId: string, payload: SaveStepPayload) => payload),
  createProfile: vi.fn()
};

vi.mock('@/stores/clinics', () => ({
  useClinicStore: () => clinicStoreMock
}));

describe('PipelineStepsTab step type source + save payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
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
          VSelect: {
            props: {
              modelValue: { type: [String, Number, Boolean, Object, Array], default: null },
              items: { type: Array, default: () => [] }
            },
            template: '<div class="v-select-probe" :data-items="items.join(\'|\')"><slot /></div>'
          },
          VSnackbar: { template: '<div><slot /></div>' },
          VDialog: { template: '<div><slot /></div>' },
          'v-code': { template: '<pre><slot /></pre>' }
        }
      }
    });
  }

  it('loads canonical step types from backend endpoint', async () => {
    mountView();
    await nextTick();

    expect(clinicStoreMock.fetchPipelineStepTypes).toHaveBeenCalledTimes(1);
  });

  it('binds canonical catalog options into the step-type picker', async () => {
    const wrapper = mountView();
    await nextTick();
    await nextTick();

    const probes = wrapper.findAll('.v-select-probe');
    const itemsCatalogs = probes.map((probe) => probe.attributes('data-items'));

    expect(itemsCatalogs).toContain('plan_matching|create_commlog|render_note');
  });

  it('preserves existing step id in save payload', async () => {
    const wrapper = mountView();
    await nextTick();
    await nextTick();

    const saveButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Save Steps'));

    expect(saveButton).toBeDefined();
    await saveButton!.trigger('click');

    expect(clinicStoreMock.saveProfileSteps).toHaveBeenCalledTimes(1);
    const payload = clinicStoreMock.saveProfileSteps.mock.calls[0][1];
    expect(payload[0].id).toBe('step-1');
  });
});
