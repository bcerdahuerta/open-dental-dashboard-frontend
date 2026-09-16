import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h, type PropType } from 'vue';

import WorkflowBuilder from '@/views/admin/WorkflowBuilder.vue';
import CatalogComposerPanel from '@/components/workflow-builder/CatalogComposerPanel.vue';
import { WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';
import { useClientStore, type ClientItem } from '@/stores/clients';
import type { WorkflowBuilderCatalog } from '@/types/workflowBuilder';

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  root: vi.fn(),
  versions: vi.fn(),
  materialize: vi.fn(),
  bootstrap: vi.fn(),
  createVersion: vi.fn()
}));

vi.mock('@/api/workflowBuilder', () => ({ workflowBuilderApi: api }));

const catalog: WorkflowBuilderCatalog = {
  catalog_version: 'workflow-builder-capability-catalog-v1',
  archetypes: ['basic-verification@1'],
  packs: { 'custom-notes@1': ['plan-note', 'subscriber-note'] },
  atoms: ['appointment-note', 'plan-note', 'plan-create'],
  archetype_facts: {
    'basic-verification@1': {
      selected_atom_keys: ['appointment-note'],
      locked_atom_keys: ['appointment-note'],
      capability_states: { 'appointment-note': 'REQUIRED', 'plan-note': 'OPTIONAL', 'plan-create': 'FORBIDDEN' },
      dependencies: []
    }
  }
};

const root = {
  blueprint_id: 'root-a',
  origin: 'BOOTSTRAPPED',
  versions: []
};

const versions = {
  blueprint_id: 'root-a',
  origin: 'BOOTSTRAPPED',
  versions: [
    {
      version_id: 'version-a',
      ordinal: 1,
      state: 'DRAFT',
      content_digest: 'sha256:one',
      disposition: null,
      replacement_version_id: null,
      created_at: '2026-09-08T00:00:00.000000Z'
    }
  ]
};

function response(data: unknown, etag = '"etag-a"') {
  return { data, status: 200, etag, headers: new Headers() };
}

const clientFixtures: ClientItem[] = [
  {
    id: 'client-a',
    client_name: 'Client A',
    product_type: 'Standard',
    is_active: true,
    slack_webhook: null,
    slack_qa_ids: null,
    days_in_advance: 3,
    created_at: '2026-09-08T00:00:00.000000Z',
    updated_at: '2026-09-08T00:00:00.000000Z'
  }
];

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify({ data: payload }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function storeFetchMock(payload: { clients?: unknown[]; clinics?: unknown[] } = {}) {
  return vi.fn(async (url: string) => jsonResponse(String(url).includes('/clinics') ? (payload.clinics ?? []) : (payload.clients ?? [])));
}

async function mountBuilder() {
  // Mount inside a router view: WorkflowBuilder registers onBeforeRouteLeave, which requires an active route record.
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: WorkflowBuilder }] });
  await router.push('/');
  await router.isReady();
  return mount(RouterView, {
    global: {
      plugins: [router],
      stubs: {
        UiParentCard: { template: '<section><slot name="action" /><slot /></section>' },
        BaseBreadcrumb: true,
        VTextField: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
        },
        VSelect: defineComponent({
          props: {
            modelValue: { type: [String, Array] as PropType<string | string[]>, default: '' },
            items: { type: Array, default: () => [] },
            itemTitle: { type: String, default: 'title' },
            itemValue: { type: String, default: 'value' }
          },
          emits: ['update:modelValue'],
          setup(selectProps, { attrs, emit }) {
            return () => {
              const options = (selectProps.items as unknown[]).map((item) =>
                item !== null && typeof item === 'object'
                  ? {
                      title: String((item as Record<string, unknown>)[selectProps.itemTitle] ?? ''),
                      value: String((item as Record<string, unknown>)[selectProps.itemValue] ?? '')
                    }
                  : { title: String(item), value: String(item) }
              );
              return h(
                'select',
                {
                  ...attrs,
                  value: selectProps.modelValue,
                  onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value)
                },
                options.map((option) => h('option', { key: option.value, value: option.value }, option.title))
              );
            };
          }
        }),
        CatalogComposerPanel: {
          props: ['catalog', 'loading', 'rootExists'],
          emits: ['preview', 'bootstrap'],
          inheritAttrs: false,
          template:
            "<div v-bind=\"$attrs\"><button data-test=\"preview\" @click=\"$emit('preview', { schema_version: 'assisted-authoring-v1', catalog_version: 'workflow-builder-capability-catalog-v1', archetype_key: 'basic-verification@1' })\">Preview</button><button data-test=\"bootstrap\" @click=\"$emit('bootstrap', 'basic-verification@1')\">Bootstrap</button></div>"
        },
        PreviewDraftPanel: {
          props: ['materialization', 'rootEtag', 'loading'],
          emits: ['create-draft'],
          inheritAttrs: false,
          template:
            '<div v-bind="$attrs"><button data-test="draft" @click="$emit(\'create-draft\')">Create draft</button><div data-test="diagnostics">{{ materialization?.diagnostics?.[0]?.code }}</div></div>'
        },
        RootHistoryPanel: { props: ['history'], template: '<div>{{ history?.versions?.[0]?.content_digest }}</div>' },
        ExceptionPanel: true
      }
    }
  });
}

describe('Workflow Builder closed composer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.stubGlobal('fetch', storeFetchMock({ clients: clientFixtures }));
    useClientStore().clients = clientFixtures;
    api.catalog.mockResolvedValue(response(catalog, '"catalog-a"'));
    api.root.mockResolvedValue(response(root, '"root-a"'));
    api.versions.mockResolvedValue(response(versions, '"versions-a"'));
  });

  it('renders server locks and prevents forbidden atoms from becoming authoring controls', () => {
    const wrapper = mount(CatalogComposerPanel, {
      props: { catalog, loading: false },
      global: {
        stubs: {
          VCheckbox: { props: ['disabled'], template: '<button v-bind="$attrs" :disabled="disabled"></button>' }
        }
      }
    });

    expect(wrapper.text()).toContain('appointment-note');
    expect(wrapper.text()).toContain('Required and locked');
    expect(wrapper.text()).toContain('plan-create');
    expect(wrapper.find('[data-test="atom-plan-create"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-test="atom-appointment-note"]').attributes('disabled')).toBeDefined();
  });

  it('keeps an opaque client denial unavailable and does not offer bootstrap authority', async () => {
    api.catalog.mockRejectedValue(new WorkflowBuilderHttpError(404, null, null, new Headers(), 'not found'));
    const wrapper = await mountBuilder();

    await wrapper.get('[data-test="load-client"]').setValue('client-a');
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Workflow Builder is unavailable for this client.');
    expect(wrapper.find('[data-test="bootstrap"]').exists()).toBe(false);
  });

  it('submits only server preview material for draft creation and renders safe diagnostics', async () => {
    api.materialize.mockResolvedValue(
      response({
        candidate: {
          lifecycle: 'DRAFT',
          selected_atom_keys: ['appointment-note'],
          locked_atom_keys: ['appointment-note'],
          expansion_trace: [],
          capability_states: {},
          dependencies: [],
          diagnostics: []
        },
        canonical_bytes: '{"lifecycle":"DRAFT"}',
        digest: 'sha256:preview',
        diagnostics: []
      })
    );
    api.createVersion.mockResolvedValue(response({ version_id: 'draft-a' }, '"root-next"'));
    const wrapper = await mountBuilder();

    await wrapper.get('[data-test="load-client"]').setValue('client-a');
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-test="preview"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-test="draft"]').trigger('click');
    await flushPromises();

    expect(api.createVersion).toHaveBeenCalledWith(
      'client-a',
      expect.objectContaining({
        body: {
          contract_version: 'assisted-authoring-v1',
          canonical_bytes: '{"lifecycle":"DRAFT"}',
          digest: 'sha256:preview'
        },
        ifMatch: '"root-a"'
      })
    );

    api.materialize.mockResolvedValue(
      response({
        candidate: null,
        canonical_bytes: null,
        digest: null,
        diagnostics: [{ code: 'REQUIRED_ATOM_LOCKED', subject_kind: 'REQUEST' }]
      })
    );
    await wrapper.get('[data-test="preview"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('REQUIRED_ATOM_LOCKED');
  });

  it('preserves 304 data, treats 409 as correction, and refreshes after a 412 draft conflict', async () => {
    const wrapper = await mountBuilder();
    await wrapper.get('[data-test="load-client"]').setValue('client-a');
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();

    api.catalog.mockRejectedValueOnce(new WorkflowBuilderHttpError(304, null, '"catalog-a"', new Headers(), ''));
    api.root.mockRejectedValueOnce(new WorkflowBuilderHttpError(304, null, '"root-a"', new Headers(), ''));
    api.versions.mockRejectedValueOnce(new WorkflowBuilderHttpError(304, null, '"versions-a"', new Headers(), ''));
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('sha256:one');

    api.materialize.mockResolvedValue(
      response({
        candidate: {
          lifecycle: 'DRAFT',
          selected_atom_keys: [],
          locked_atom_keys: [],
          expansion_trace: [],
          capability_states: {},
          dependencies: [],
          diagnostics: []
        },
        canonical_bytes: '{}',
        digest: 'sha256:preview',
        diagnostics: []
      })
    );
    await wrapper.get('[data-test="preview"]').trigger('click');
    await flushPromises();
    api.createVersion.mockRejectedValueOnce(new WorkflowBuilderHttpError(409, null, null, new Headers(), 'conflict'));
    await wrapper.get('[data-test="draft"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Correct the current Workflow Builder state before trying again.');

    api.createVersion.mockRejectedValueOnce(new WorkflowBuilderHttpError(412, null, null, new Headers(), 'stale'));
    await wrapper.get('[data-test="draft"]').trigger('click');
    await flushPromises();
    expect(api.catalog).toHaveBeenCalledTimes(3);
    expect(api.root).toHaveBeenCalledTimes(3);
    expect(api.versions).toHaveBeenCalledTimes(3);
  });

  it('bootstraps only after catalog admission with the server selector and refreshes history', async () => {
    api.root.mockRejectedValueOnce(new WorkflowBuilderHttpError(404, null, null, new Headers(), 'not found'));
    api.bootstrap.mockResolvedValue(response({ ...root, blueprint_id: 'root-new' }, '"root-new"'));
    const wrapper = await mountBuilder();

    await wrapper.get('[data-test="load-client"]').setValue('client-a');
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-test="bootstrap"]').trigger('click');
    await flushPromises();

    expect(api.bootstrap).toHaveBeenCalledWith(
      'client-a',
      expect.objectContaining({ body: { archetype_key: 'basic-verification@1' }, ifNoneMatch: '*' })
    );
    expect(api.root).toHaveBeenCalledTimes(2);
    expect(api.versions).toHaveBeenCalledTimes(2);
  });

  it('uses the separate bounded versions projection with its exact server DTO names', async () => {
    const wrapper = await mountBuilder();

    await wrapper.get('[data-test="load-client"]').setValue('client-a');
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();

    expect(api.versions).toHaveBeenCalledWith('client-a', expect.any(AbortSignal), undefined);
    expect(wrapper.text()).toContain('sha256:one');
    expect(wrapper.text()).not.toContain('client-a');
  });
});
