import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkforceAnalyticsPanel from '@/views/extraction/workforce/WorkforceAnalyticsPanel.vue';

describe('WorkforceAnalyticsPanel', () => {
  it('shows pending analytics state when backend metrics are unavailable', () => {
    const wrapper = mount(WorkforceAnalyticsPanel, {
      props: {
        analytics: {
          encargado_id: 'enc-1',
          analytics_status: { state: 'pending', missing_metrics: ['verification_volume', 'completion_rate'], updated_at: null },
          metrics: { client_count: 1, clinic_count: 1, verification_volume: null, completion_rate: null }
        },
        member: null,
        loading: false
      },
      global: {
        stubs: {
          apexchart: { template: '<div class="apexchart-stub"></div>' },
          VChip: { template: '<span><slot /></span>' },
          VAlert: { template: '<div><slot /></div>' },
          VProgressCircular: true,
          VBtn: { template: '<button><slot /></button>' }
        }
      }
    });

    expect(wrapper.text()).toContain('pending');
    expect(wrapper.text()).toContain('verification_volume');
  });

  it('renders chart only from backend-provided counts', () => {
    const wrapper = mount(WorkforceAnalyticsPanel, {
      props: {
        analytics: {
          encargado_id: 'enc-1',
          analytics_status: { state: 'ready', missing_metrics: [], updated_at: '2026-04-22T00:00:00Z' },
          metrics: { client_count: 4, clinic_count: 2, verification_volume: 12, completion_rate: 75 }
        },
        member: null,
        loading: false
      },
      global: {
        stubs: {
          apexchart: { template: '<div class="apexchart-stub"></div>' },
          VChip: { template: '<span><slot /></span>' },
          VAlert: { template: '<div><slot /></div>' },
          VProgressCircular: true,
          VBtn: { template: '<button><slot /></button>' }
        }
      }
    });

    expect(wrapper.find('.apexchart-stub').exists()).toBe(true);
    expect(wrapper.text()).toContain('12');
    expect(wrapper.text()).toContain('75%');
  });

  it('does not render chart from member workload fallback when analytics payload is missing', () => {
    const wrapper = mount(WorkforceAnalyticsPanel, {
      props: {
        analytics: null,
        member: {
          id: 'enc-2',
          name: 'Fallback User',
          email: 'fallback@example.com',
          is_active: true,
          clinic_ids: ['clinic-1'],
          client_ids: ['client-1'],
          resolved_assignment_scope: 'clinic',
          resolved_assignment_client_ids: ['client-1'],
          resolved_assignment_clinic_ids: ['clinic-1'],
          workload_summary: { resolved_client_count: 3, resolved_clinic_count: 2, direct_clinic_count: 1, legacy_client_count: 1 },
          analytics_status: { state: 'pending', missing_metrics: ['verification_volume', 'completion_rate'], updated_at: null },
          created_at: '2026-04-01T00:00:00Z'
        },
        loading: false
      },
      global: {
        stubs: {
          apexchart: { template: '<div class="apexchart-stub"></div>' },
          VChip: { template: '<span><slot /></span>' },
          VAlert: { template: '<div><slot /></div>' },
          VProgressCircular: true,
          VBtn: { template: '<button><slot /></button>' }
        }
      }
    });

    expect(wrapper.find('.apexchart-stub').exists()).toBe(false);
    expect(wrapper.text()).toContain('No backend analytics counts available yet.');
  });
});
