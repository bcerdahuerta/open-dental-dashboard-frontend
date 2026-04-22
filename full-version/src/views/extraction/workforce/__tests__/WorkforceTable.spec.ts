import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkforceTable from '@/views/extraction/workforce/WorkforceTable.vue';
import type { Encargado } from '@/types/extraction';

const member: Encargado = {
  id: 'enc-1',
  name: 'Ana Perez',
  email: 'ana@example.com',
  is_active: true,
  clinic_ids: ['clinic-1'],
  client_ids: ['client-1'],
  resolved_assignment_scope: 'clinic',
  resolved_assignment_client_ids: ['client-1'],
  resolved_assignment_clinic_ids: ['clinic-1'],
  analytics_status: { state: 'pending', missing_metrics: ['verification_volume'], updated_at: null },
  created_at: '2026-04-01T00:00:00Z'
};

describe('WorkforceTable', () => {
  it('renders fallback workload counts and analytics state without expandable rows', () => {
    const wrapper = mount(WorkforceTable, {
      props: {
        members: [member],
        loading: false,
        selectedId: null,
        search: ''
      },
      global: {
        stubs: {
          VTextField: { template: '<input />' },
          VDataTable: false,
          VChip: { template: '<span><slot /></span>' },
          VBtn: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          VIcon: true,
          EyeIcon: true,
          PencilIcon: true,
          RefreshIcon: true,
          UsersIcon: true
        }
      }
    });

    expect(wrapper.text()).toContain('Ana Perez');
    expect(wrapper.text()).toContain('1 clinic');
    expect(wrapper.text()).toContain('1 client');
    expect(wrapper.text()).toContain('pending');
    expect(wrapper.html()).not.toContain('expanded-row');
  });

  it('emits row action events for details, edit, and reassign', async () => {
    const wrapper = mount(WorkforceTable, {
      props: {
        members: [member],
        loading: false,
        selectedId: null,
        search: ''
      },
      global: {
        stubs: {
          VTextField: { template: '<input />' },
          VDataTable: false,
          VChip: { template: '<span><slot /></span>' },
          VBtn: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          EyeIcon: true,
          PencilIcon: true,
          RefreshIcon: true,
          UsersIcon: true
        }
      }
    });

    await wrapper.get('[data-test="workforce-open-enc-1"]').trigger('click');
    await wrapper.get('[data-test="workforce-edit-enc-1"]').trigger('click');
    await wrapper.get('[data-test="workforce-reassign-enc-1"]').trigger('click');

    expect(wrapper.emitted('open')?.[0]).toEqual(['enc-1']);
    expect(wrapper.emitted('edit')?.[0]).toEqual(['enc-1']);
    expect(wrapper.emitted('reassign')?.[0]).toEqual(['enc-1']);
  });
});
