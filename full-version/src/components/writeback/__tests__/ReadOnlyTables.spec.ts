import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseProfilesCatalogTable from '@/components/writeback/BaseProfilesCatalogTable.vue';
import ClientAssignmentsTable from '@/components/writeback/ClientAssignmentsTable.vue';
import ClinicOverridesTable from '@/components/writeback/ClinicOverridesTable.vue';

describe('Profile Resolution read-only tables', () => {
  it('renders base profiles with read-only copy', () => {
    const wrapper = mount(BaseProfilesCatalogTable, {
      props: {
        loading: false,
        error: null,
        items: [
          {
            id: 'bp-1',
            profile_name: 'Base Profile 1',
            context_requirements: ['has_shortform'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      }
    });

    expect(wrapper.text()).toContain('Read-only');
    expect(wrapper.text()).toContain('Base profiles catalog');
  });

  it('renders client assignment selector + table with action buttons', () => {
    const wrapper = mount(ClientAssignmentsTable, {
      props: {
        clients: [{ id: 'c1', client_name: 'Client One', product_type: 'writeback', is_active: true, slack_webhook: null, slack_qa_ids: null, days_in_advance: 5, created_at: '', updated_at: '' }],
        selectedClientId: 'c1',
        clientSearch: '',
        items: [],
        loadingClients: false,
        loading: false,
        error: null
      }
    });

    expect(wrapper.text()).toContain('Client Assignments');
    expect(wrapper.text()).toContain('Create Assignment');
    // Has Actions column header in table
    expect(wrapper.html()).toContain('Actions');
  });

  it('renders clinic overrides selector + table with action buttons', () => {
    const wrapper = mount(ClinicOverridesTable, {
      props: {
        clinics: [{ id: 'k1', clinic_name: 'Clinic One' }],
        selectedClinicId: 'k1',
        clinicSearch: '',
        items: [],
        loadingClinics: false,
        loading: false,
        error: null
      }
    });

    expect(wrapper.text()).toContain('Clinic Overrides');
    expect(wrapper.text()).toContain('Create Override');
    // Has Actions column header in table
    expect(wrapper.html()).toContain('Actions');
  });
});
