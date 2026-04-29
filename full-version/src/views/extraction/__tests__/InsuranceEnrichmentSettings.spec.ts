import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import InsuranceEnrichmentSettings from '@/views/extraction/InsuranceEnrichmentSettings.vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

type InsuranceEnrichmentVm = {
  selectedClientId: string;
  clientForm: {
    document_file_naming: {
      form_with_print: boolean;
      short_form: boolean | null | undefined;
    };
  };
  saveClientConfig: () => Promise<void>;
};

vi.mock('@/utils/helpers/fetch-wrapper', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('InsuranceEnrichmentSettings document file naming', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(fetchWrapper.get).mockImplementation(async (url: string) => {
      if (url.includes('/clients?')) {
        return [{ id: 'client-1', client_name: 'Mint Dentistry', product_type: 'Custom', is_active: true, slack_webhook: null, slack_qa_ids: null, days_in_advance: 4, created_at: '', updated_at: '' }];
      }
      if (url.includes('/insurance-enrichment/config?')) {
        return {
          client_id: 'client-1',
          client_name: 'Mint Dentistry',
          defaults: {
            enabled: true,
            application_mode: 'preview',
            gemini_enabled: false,
            gemini_model: 'gemini-3.1-flash-lite-preview',
            gemini_only_when_parser_incomplete: true,
            max_gemini_calls_per_run: 25,
            apply_only_when_carrier_generic: true,
            set_verification_type_on_enrichment: true,
            verification_type_value: 'FBD',
            update_filenames: true,
            fields_applied: {},
            document_file_naming: { form_with_print: true, short_form: false, effective_source: 'client_config' }
          },
          effective_client_config: {
            enabled: true,
            application_mode: 'preview',
            gemini_enabled: false,
            gemini_model: 'gemini-3.1-flash-lite-preview',
            gemini_only_when_parser_incomplete: true,
            max_gemini_calls_per_run: 25,
            apply_only_when_carrier_generic: true,
            set_verification_type_on_enrichment: true,
            verification_type_value: 'FBD',
            update_filenames: true,
            fields_applied: {},
            document_file_naming: { form_with_print: true, short_form: false, effective_source: 'client_config' }
          },
          clinics: [
            {
              clinic_id: 'clinic-1',
              clinic_name: 'Mint Irving',
              has_override: true,
              effective_status: 'enabled',
              effective_config: {
                enabled: true,
                application_mode: 'preview',
                gemini_enabled: false,
                gemini_model: 'gemini-3.1-flash-lite-preview',
                gemini_only_when_parser_incomplete: true,
                max_gemini_calls_per_run: 25,
                apply_only_when_carrier_generic: true,
                set_verification_type_on_enrichment: true,
                verification_type_value: 'FBD',
                update_filenames: true,
                fields_applied: {},
                document_file_naming: { form_with_print: false, short_form: true, effective_source: 'clinic_override' }
              },
              clinic_override: {
                id: 'ovr-1',
                clinic_id: 'clinic-1',
                enabled: true,
                application_mode: 'preview',
                gemini_enabled: false,
                gemini_model: 'gemini-3.1-flash-lite-preview',
                gemini_only_when_parser_incomplete: true,
                max_gemini_calls_per_run: 25,
                apply_only_when_carrier_generic: true,
                set_verification_type_on_enrichment: true,
                verification_type_value: 'FBD',
                update_filenames: true,
                fields_applied: {},
                document_file_naming: { form_with_print: false, short_form: null, effective_source: 'clinic_override' },
                created_at: null,
                updated_at: null
              },
              inheritance: { source: 'clinic_override', application_mode: 'preview' }
            }
          ],
          audit_trail: []
        };
      }
      return [];
    });
    vi.mocked(fetchWrapper.patch).mockImplementation(async () => ({
      client_id: 'client-1',
      client_name: 'Mint Dentistry',
      defaults: { enabled: true, application_mode: 'preview', gemini_enabled: false, gemini_model: 'gemini-3.1-flash-lite-preview', gemini_only_when_parser_incomplete: true, max_gemini_calls_per_run: 25, apply_only_when_carrier_generic: true, set_verification_type_on_enrichment: true, verification_type_value: 'FBD', update_filenames: true, fields_applied: {}, document_file_naming: { form_with_print: true, short_form: false, effective_source: 'client_config' } },
      effective_client_config: { enabled: true, application_mode: 'preview', gemini_enabled: false, gemini_model: 'gemini-3.1-flash-lite-preview', gemini_only_when_parser_incomplete: true, max_gemini_calls_per_run: 25, apply_only_when_carrier_generic: true, set_verification_type_on_enrichment: true, verification_type_value: 'FBD', update_filenames: true, fields_applied: {}, document_file_naming: { form_with_print: true, short_form: false, effective_source: 'client_config' } },
      clinics: [],
      audit_trail: []
    }));
  });

  it('renders document file naming section and sends nested client payload with defaults', async () => {
    const wrapper = mount(InsuranceEnrichmentSettings, {
      global: {
        stubs: {
          BaseBreadcrumb: { template: '<div />' },
          UiParentCard: { template: '<div><h3>{{ title }}</h3><slot /></div>', props: ['title'] },
          VRow: { template: '<div><slot /></div>' },
          VCol: { template: '<div><slot /></div>' },
          VAlert: { template: '<div><slot /></div>' },
          VDataTable: { template: '<div><slot /></div>' },
          VDialog: { template: '<div><slot /></div>' },
        }
      }
    });

    const vm = wrapper.vm as unknown as InsuranceEnrichmentVm;

    vm.selectedClientId = 'client-1';
    await flushPromises();

    expect(wrapper.text()).toContain('Document File Naming');

    vm.clientForm.document_file_naming.form_with_print = false;
    vm.clientForm.document_file_naming.short_form = undefined;
    await vm.saveClientConfig();

    expect(vi.mocked(fetchWrapper.patch).mock.calls[0]?.[1]).toMatchObject({
      document_file_naming: {
        form_with_print: false,
        short_form: false
      }
    });
  });
});
