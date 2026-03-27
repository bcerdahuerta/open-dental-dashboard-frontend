import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ProfileResolutionExplainPanel from '@/components/writeback/ProfileResolutionExplainPanel.vue';

describe('ProfileResolutionExplainPanel', () => {
  it('shows unresolved state when winner is null', () => {
    const wrapper = mount(ProfileResolutionExplainPanel, {
      props: {
        loading: false,
        response: {
          winner: null,
          normalized_status: 'maxout',
          candidates: []
        }
      }
    });

    expect(wrapper.text()).toContain('No se encontró winner');
    expect(wrapper.text()).toContain('maxout');
  });

  it('renders winner profile and precedence details', () => {
    const wrapper = mount(ProfileResolutionExplainPanel, {
      props: {
        loading: false,
        response: {
          winner: {
            scope: 'clinic_override',
            precedence: 0,
            profile: { id: 'bp-10', name: 'Clinic Winner' }
          },
          normalized_status: 'maxout',
          candidates: [
            {
              scope: 'clinic_override',
              matched: true,
              precedence: 0,
              profile: { id: 'bp-10', name: 'Clinic Winner' }
            }
          ]
        }
      }
    });

    expect(wrapper.text()).toContain('Clinic Winner');
    expect(wrapper.text()).toContain('Precedence: 0');
    expect(wrapper.text()).toContain('matched');
  });
});
