import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ProfileResolutionSimulatorForm from '@/components/writeback/ProfileResolutionSimulatorForm.vue';

describe('ProfileResolutionSimulatorForm', () => {
  it('blocks submit when required fields are missing', async () => {
    const wrapper = mount(ProfileResolutionSimulatorForm, {
      props: {
        clients: [],
        clinics: [],
        clientSearch: '',
        clinicSearch: '',
        loading: false,
        modelValue: {
          client_id: '',
          clinic_id: '',
          verification_type: '',
          verification_status: ''
        }
      }
    });

    await wrapper.get('[data-testid="simulator-submit"]').trigger('click');

    expect(wrapper.text()).toContain('Client ID es obligatorio.');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('emits submit when form is valid', async () => {
    const wrapper = mount(ProfileResolutionSimulatorForm, {
      props: {
        clients: [{ id: 'client-1', client_name: 'Burch' }],
        clinics: [{ id: 'clinic-1', clinic_name: 'Main Clinic' }],
        clientSearch: '',
        clinicSearch: '',
        loading: false,
        modelValue: {
          client_id: 'client-1',
          clinic_id: 'clinic-1',
          verification_type: 'ELG',
          verification_status: 'Max Out'
        }
      }
    });

    await wrapper.get('[data-testid="simulator-submit"]').trigger('click');

    expect(wrapper.emitted('submit')).toBeTruthy();
  });
});
