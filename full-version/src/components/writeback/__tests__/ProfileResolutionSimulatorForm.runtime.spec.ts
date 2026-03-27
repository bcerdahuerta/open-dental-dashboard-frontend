import { describe, expect, it } from 'vitest';
import { config, mount } from '@vue/test-utils';
import ProfileResolutionSimulatorForm from '@/components/writeback/ProfileResolutionSimulatorForm.vue';

describe('ProfileResolutionSimulatorForm runtime smoke', () => {
  it('mounts with real Vuetify components and submits valid data', async () => {
    const originalCompilerOptions = config.global.config?.compilerOptions;
    config.global.config = {
      ...(config.global.config ?? {}),
      compilerOptions: {
        ...(config.global.config?.compilerOptions ?? {}),
        isCustomElement: () => false
      }
    };

    try {
      const wrapper = mount(ProfileResolutionSimulatorForm, {
        props: {
          clients: [{ id: 'client-1', client_name: 'Burch' }],
          clinics: [{ id: 'clinic-1', clinic_name: 'Main Clinic' }],
          clientSearch: '',
          clinicSearch: '',
          loading: false,
          loadingClients: false,
          loadingClinics: false,
          modelValue: {
            client_id: 'client-1',
            clinic_id: 'clinic-1',
            verification_type: 'ELG',
            verification_status: 'Max Out'
          }
        },
        global: {
          stubs: {
            transition: false,
            'transition-group': false,
            teleport: true
          }
        }
      });

      expect(wrapper.findAllComponents({ name: 'VAutocomplete' })).toHaveLength(2);

      await wrapper.get('[data-testid="simulator-submit"]').trigger('click');
      expect(wrapper.emitted('submit')).toBeTruthy();
    } finally {
      config.global.config = {
        ...(config.global.config ?? {}),
        compilerOptions: {
          ...(config.global.config?.compilerOptions ?? {}),
          isCustomElement: originalCompilerOptions?.isCustomElement
        }
      };
    }
  });
});
