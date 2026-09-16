import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { RouterView, createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h, type PropType } from 'vue';

import WorkflowBuilder from '@/views/admin/WorkflowBuilder.vue';

import CatalogComposerPanel from '@/components/workflow-builder/CatalogComposerPanel.vue';
import PreviewDraftPanel from '@/components/workflow-builder/PreviewDraftPanel.vue';
import RootHistoryPanel from '@/components/workflow-builder/RootHistoryPanel.vue';
import ExceptionPanel from '@/components/workflow-builder/ExceptionPanel.vue';
import { WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';
import type {
  WorkflowBlueprintException,
  WorkflowBlueprintVersion,
  WorkflowBuilderCatalog,
  WorkflowBuilderMaterialization
} from '@/types/workflowBuilder';

const api = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  catalog: vi.fn(),
  root: vi.fn(),
  versions: vi.fn(),
  materialize: vi.fn(),
  createVersion: vi.fn(),
  version: vi.fn(),
  transitionVersion: vi.fn(),
  exceptionContext: vi.fn(),
  exceptions: vi.fn(),
  exception: vi.fn(),
  createException: vi.fn(),
  transitionException: vi.fn()
}));

vi.mock('@/api/workflowBuilder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/workflowBuilder')>()),
  workflowBuilderApi: api
}));

import { useWorkflowBuilderStore } from '@/stores/workflowBuilder';

const version = {
  version_id: '11111111-1111-4111-8111-111111111111',
  ordinal: 2,
  state: 'IN_REVIEW' as const,
  content_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  disposition: null,
  replacement_version_id: null,
  created_at: '2026-09-09T00:00:00.000000Z'
};
const approvedBase = { ...version, version_id: '22222222-2222-4222-8222-222222222222', state: 'APPROVED' as const };
const exception = {
  exception_id: '33333333-3333-4333-8333-333333333333',
  base_version_id: approvedBase.version_id,
  base_version_digest: approvedBase.content_digest,
  state: 'IN_REVIEW' as const,
  delta_digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  rationale: 'clinic-specific requirement',
  created_at: '2026-09-09T00:00:00.000000Z'
};

function response(data: unknown, etag: string) {
  return { data, status: 200, etag, headers: new Headers() };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify({ data: payload }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function storeFetchMock(payload: { clients?: unknown[]; clinics?: unknown[] } = {}) {
  return vi.fn(async (url: string) => jsonResponse(String(url).includes('/clinics') ? (payload.clinics ?? []) : (payload.clients ?? [])));
}

const controls = {
  // Decorative breadcrumb renders <v-icon icon="$home">; the test setup installs Vuetify without icon aliases, so stub it to keep the alias warning out of this lifecycle spec.
  BaseBreadcrumb: true,
  VBtn: { emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
  VTextField: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
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
  VCheckbox: {
    props: ['modelValue', 'value'],
    emits: ['update:modelValue'],
    template:
      '<input v-bind="$attrs" type="checkbox" :checked="modelValue.includes?.(value)" @change="$emit(\'update:modelValue\', $event.target.checked ? [...modelValue, value] : modelValue.filter((item) => item !== value))" />'
  },
  VAlert: { template: '<div><slot /></div>' },
  VList: { template: '<div><slot /></div>' },
  VListItem: { template: '<div><slot name="prepend" /><slot /><slot name="append" /></div>' },
  VListItemTitle: { template: '<div><slot /></div>' },
  VListItemSubtitle: { template: '<div><slot /></div>' }
};

describe('Workflow Builder lifecycle controls', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.stubGlobal('fetch', storeFetchMock());
  });

  it('mounts personal version approval controls without treating authorship or role as approval authority', async () => {
    const wrapper = mount(RootHistoryPanel, {
      props: {
        root: { blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [], current_exception: null },
        history: { blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [version], current_exception: null },
        authenticatedSubjectId: 'subject-a'
      },
      global: { stubs: controls }
    });

    await wrapper.get('[data-test="approve-version"]').trigger('click');

    expect(wrapper.text()).toContain('Server verifies exact personal approval eligibility.');
    expect(wrapper.emitted('approve')).toEqual([[version.version_id]]);
    expect(wrapper.text()).not.toContain('role');
  });

  it('uses a fresh exact version ETag with an empty approval body and replays the immutable original command', async () => {
    api.version.mockResolvedValue(response(version, '"version-etag"'));
    api.transitionVersion.mockResolvedValue(response({ ...version, state: 'APPROVED' }, '"approved-etag"'));
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');

    const receipt = await store.approveVersion(version.version_id);
    await receipt.retry();

    expect(api.transitionVersion).toHaveBeenCalledTimes(2);
    const [, , first] = api.transitionVersion.mock.calls[0];
    const [, , replay] = api.transitionVersion.mock.calls[1];
    expect(first).toBe(replay);
    expect(first).toMatchObject({ body: {}, ifMatch: '"version-etag"' });
    expect(first).not.toHaveProperty('replay');
    expect(api.version).toHaveBeenCalledWith('client-a', version.version_id, undefined);
  });

  it('sends only a discard reason, preserves 409 correction, and refreshes after 412', async () => {
    api.version.mockResolvedValue(response({ ...version, state: 'DRAFT' }, '"draft-etag"'));
    api.transitionVersion.mockRejectedValueOnce(new WorkflowBuilderHttpError(409, null, null, new Headers(), 'conflict'));
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');

    await expect(store.discardVersion(version.version_id, 'CORRECTION')).rejects.toMatchObject({ status: 409 });
    expect(api.transitionVersion).toHaveBeenCalledWith(
      'client-a',
      version.version_id,
      expect.objectContaining({ body: { reason_category: 'CORRECTION' }, ifMatch: '"draft-etag"' }),
      'discard'
    );
  });

  it('mounts a sparse exception form with UNTIL_SUPERSEDED and sends only the exact delta body', async () => {
    const wrapper = mount(ExceptionPanel, {
      props: {
        clinics: [{ id: 'clinic-a', clinic_name: 'Clinic A' }],
        baseVersions: [approvedBase],
        optionalAtomKeys: ['plan-note'],
        context: { base_version: approvedBase, current: null },
        history: { exceptions: [exception], current_exception: null },
        authenticatedSubjectId: 'subject-a'
      },
      global: { stubs: controls }
    });

    await wrapper.get('[data-test="exception-clinic-id"]').setValue('clinic-a');
    await wrapper.get('[data-test="exception-base-version"]').setValue(approvedBase.version_id);
    await wrapper.get('[data-test="exception-rationale"]').setValue('clinic-specific requirement');
    await wrapper.get('[data-test="exception-add-plan-note"]').setValue(true);
    await wrapper.get('[data-test="create-exception"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Effective UNTIL_SUPERSEDED — no expiry.');
    const historyRow = wrapper.get('[data-test="exception-history-row"]');
    expect(historyRow.text()).toContain('UNTIL_SUPERSEDED');
    expect(historyRow.text()).toContain(`base ${approvedBase.version_id}`);
    expect(historyRow.text()).toContain(approvedBase.content_digest);
    expect(wrapper.emitted('create')).toEqual([
      [
        {
          clinicId: 'clinic-a',
          baseVersionId: approvedBase.version_id,
          delta: {
            delta_version: 'blueprint-clinic-exception-delta-v1',
            add_atom_keys: ['plan-note'],
            remove_atom_keys: [],
            rationale: 'clinic-specific requirement'
          }
        }
      ]
    ]);
  });

  it('blocks a contradictory add/remove overlap without clearing the operator selections', async () => {
    const wrapper = mount(ExceptionPanel, {
      props: {
        clinics: [{ id: 'clinic-a', clinic_name: 'Clinic A' }],
        baseVersions: [approvedBase],
        optionalAtomKeys: ['plan-note'],
        context: { base_version: approvedBase, current: null },
        history: { exceptions: [exception], current_exception: null },
        authenticatedSubjectId: 'subject-a'
      },
      global: { stubs: controls }
    });

    await wrapper.get('[data-test="exception-clinic-id"]').setValue('clinic-a');
    await wrapper.get('[data-test="exception-base-version"]').setValue(approvedBase.version_id);
    await wrapper.get('[data-test="exception-rationale"]').setValue('clinic-specific requirement');
    await wrapper.get('[data-test="exception-add-plan-note"]').setValue(true);
    await wrapper.get('[data-test="exception-remove-plan-note"]').setValue(true);
    await wrapper.get('[data-test="create-exception"]').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('create')).toBeUndefined();
    expect(wrapper.find('[data-test="exception-overlap-message"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="exception-overlap-message"]').text()).toContain('plan-note');
    expect((wrapper.get('[data-test="create-exception"]').element as HTMLButtonElement).disabled).toBe(true);
    expect((wrapper.get('[data-test="exception-add-plan-note"]').element as HTMLInputElement).checked).toBe(true);
    expect((wrapper.get('[data-test="exception-remove-plan-note"]').element as HTMLInputElement).checked).toBe(true);
  });

  it('allows the exact sparse delta once the overlapping atom is removed from one side', async () => {
    const wrapper = mount(ExceptionPanel, {
      props: {
        clinics: [{ id: 'clinic-a', clinic_name: 'Clinic A' }],
        baseVersions: [approvedBase],
        optionalAtomKeys: ['plan-note'],
        context: { base_version: approvedBase, current: null },
        history: { exceptions: [exception], current_exception: null },
        authenticatedSubjectId: 'subject-a'
      },
      global: { stubs: controls }
    });

    await wrapper.get('[data-test="exception-clinic-id"]').setValue('clinic-a');
    await wrapper.get('[data-test="exception-base-version"]').setValue(approvedBase.version_id);
    await wrapper.get('[data-test="exception-rationale"]').setValue('clinic-specific requirement');
    await wrapper.get('[data-test="exception-add-plan-note"]').setValue(true);
    await wrapper.get('[data-test="exception-remove-plan-note"]').setValue(true);
    await wrapper.get('[data-test="exception-remove-plan-note"]').setValue(false);
    await wrapper.get('[data-test="create-exception"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-test="exception-overlap-message"]').exists()).toBe(false);
    expect((wrapper.get('[data-test="create-exception"]').element as HTMLButtonElement).disabled).toBe(false);
    expect(wrapper.emitted('create')).toEqual([
      [
        {
          clinicId: 'clinic-a',
          baseVersionId: approvedBase.version_id,
          delta: {
            delta_version: 'blueprint-clinic-exception-delta-v1',
            add_atom_keys: ['plan-note'],
            remove_atom_keys: [],
            rationale: 'clinic-specific requirement'
          }
        }
      ]
    ]);
  });

  it('uses context and exact exception ETags for sparse creation and separate approval', async () => {
    api.exceptionContext.mockResolvedValue(response({ base_version: approvedBase, current: null }, '"context-etag"'));
    api.createException.mockResolvedValue(response({ ...exception, state: 'DRAFT' }, '"exception-etag"'));
    api.exception.mockResolvedValue(response(exception, '"exception-etag"'));
    api.transitionException.mockResolvedValue(response({ ...exception, state: 'APPROVED' }, '"approved-exception-etag"'));
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');

    await store.loadExceptionContext('clinic-a', approvedBase.version_id);
    await store.createException('clinic-a', approvedBase.version_id, {
      delta_version: 'blueprint-clinic-exception-delta-v1',
      add_atom_keys: ['plan-note'],
      remove_atom_keys: [],
      rationale: 'clinic-specific requirement'
    });
    await store.approveException('clinic-a', exception.exception_id);

    expect(api.createException).toHaveBeenCalledWith(
      'client-a',
      'clinic-a',
      expect.objectContaining({
        body: {
          base_version_id: approvedBase.version_id,
          delta_version: 'blueprint-clinic-exception-delta-v1',
          add_atom_keys: ['plan-note'],
          remove_atom_keys: [],
          rationale: 'clinic-specific requirement'
        },
        ifMatch: '"context-etag"'
      })
    );
    expect(api.transitionException).toHaveBeenCalledWith(
      'client-a',
      'clinic-a',
      exception.exception_id,
      expect.objectContaining({ body: {}, ifMatch: '"exception-etag"' }),
      'approval'
    );
  });

  it('keeps a rejected command as a same-client manual retry receipt across refresh without replaying automatically', async () => {
    api.version.mockResolvedValue(response(version, '"version-etag"'));
    api.transitionVersion
      .mockRejectedValueOnce(new WorkflowBuilderHttpError(412, null, null, new Headers(), 'stale'))
      .mockResolvedValueOnce(response({ ...version, state: 'APPROVED' }, '"approved-etag"'));
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');

    await expect(store.approveVersion(version.version_id)).rejects.toMatchObject({ status: 412 });
    const failed = store.receipts[0];
    expect(failed).toMatchObject({ outcome: 'FAILED', failure: 'STALE' });
    expect(failed).not.toHaveProperty('command');

    api.catalog.mockResolvedValue(
      response(
        { catalog_version: 'workflow-builder-capability-catalog-v1', archetypes: [], packs: {}, atoms: [], archetype_facts: {} },
        '"catalog"'
      )
    );
    api.root.mockResolvedValue(
      response({ blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [], current_exception: null }, '"root"')
    );
    api.versions.mockResolvedValue(
      response({ blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [], current_exception: null }, '"history"')
    );
    await store.refresh();
    expect(api.transitionVersion).toHaveBeenCalledTimes(1);

    await failed.retry();
    expect(api.transitionVersion).toHaveBeenCalledTimes(2);
    expect(api.transitionVersion.mock.calls[1]?.[2]).toBe(api.transitionVersion.mock.calls[0]?.[2]);
  });

  it('does not let a late client-A success or failure overwrite client-B pending receipt', async () => {
    let resolveA!: (value: ReturnType<typeof response>) => void;
    let resolveB!: (value: ReturnType<typeof response>) => void;
    api.bootstrap
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveA = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveB = resolve;
          })
      );
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');
    const lateSuccess = store.bootstrap('basic-verification@1');
    store.selectClient('client-b');
    const clientB = store.bootstrap('basic-verification@1');
    resolveA(response({ blueprint_id: 'root-a' }, '"a"'));
    await lateSuccess;
    expect(store.receipts).toMatchObject([{ outcome: 'PENDING' }]);
    resolveB(response({ blueprint_id: 'root-b' }, '"b"'));
    await clientB;

    let rejectA!: (error: Error) => void;
    let resolveNextB!: (value: ReturnType<typeof response>) => void;
    api.bootstrap
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectA = reject;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNextB = resolve;
          })
      );
    store.selectClient('client-a');
    const lateFailure = store.bootstrap('basic-verification@1');
    store.selectClient('client-b');
    const nextClientB = store.bootstrap('basic-verification@1');
    rejectA(new Error('network unavailable'));
    await expect(lateFailure).rejects.toThrow('network unavailable');
    expect(store.receipts).toMatchObject([{ outcome: 'PENDING' }]);
    resolveNextB(response({ blueprint_id: 'root-b' }, '"b"'));
    await nextClientB;
  });

  it('does not update a pending receipt after mounted router leave revokes its command scope', async () => {
    let resolveCommand!: (value: ReturnType<typeof response>) => void;
    api.bootstrap.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCommand = resolve;
        })
    );
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workflow', component: WorkflowBuilder },
        { path: '/away', component: { template: '<p>away</p>' } }
      ]
    });
    await router.push('/workflow');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router], stubs: controls } });
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');
    const command = store.bootstrap('basic-verification@1');
    await router.push('/away');
    resolveCommand(response({ blueprint_id: 'root-a' }, '"a"'));
    await command;
    expect(store.receipts).toMatchObject([{ outcome: 'PENDING' }]);
    wrapper.unmount();
  });

  it('renders failed receipts separately from refreshed projections and permits only explicit retry', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: WorkflowBuilder }]
    });
    await router.push('/');
    await router.isReady();
    api.catalog.mockResolvedValue(
      response(
        { catalog_version: 'workflow-builder-capability-catalog-v1', archetypes: [], packs: {}, atoms: [], archetype_facts: {} },
        '"catalog"'
      )
    );
    api.root.mockResolvedValue(
      response({ blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [], current_exception: null }, '"root"')
    );
    api.versions.mockResolvedValue(
      response({ blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [], current_exception: null }, '"history"')
    );
    api.version.mockResolvedValue(response(version, '"version-etag"'));
    api.transitionVersion.mockRejectedValue(new WorkflowBuilderHttpError(409, null, null, new Headers(), 'conflict'));
    const wrapper = mount(RouterView, { global: { plugins: [router], stubs: controls } });
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');
    await expect(store.approveVersion(version.version_id)).rejects.toMatchObject({ status: 409 });
    await store.refresh();
    await flushPromises();

    expect(wrapper.text()).toContain('Failed command: conflict.');
    expect(wrapper.text()).toContain('Current projection is refreshed separately.');
    expect(wrapper.find('[data-test="retry-receipt"]').exists()).toBe(true);
    expect(api.transitionVersion).toHaveBeenCalledTimes(1);
  });

  it('proves router leave and unmount abort reads, and renders an approved successor replacement without reopening its predecessor', async () => {
    const catalogSignals: AbortSignal[] = [];
    api.catalog.mockImplementation((_clientId, signal) => {
      catalogSignals.push(signal);
      return new Promise(() => undefined);
    });
    api.root.mockImplementation(() => new Promise(() => undefined));
    api.versions.mockImplementation(() => new Promise(() => undefined));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workflow', component: WorkflowBuilder },
        { path: '/away', component: { template: '<p>away</p>' } }
      ]
    });
    await router.push('/workflow');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router], stubs: controls } });
    const store = useWorkflowBuilderStore();
    void store.load('client-a');
    await flushPromises();
    await router.push('/away');
    await flushPromises();
    expect(catalogSignals[0]?.aborted).toBe(true);
    wrapper.unmount();

    const unmountRouter = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/workflow', component: WorkflowBuilder }]
    });
    await unmountRouter.push('/workflow');
    await unmountRouter.isReady();
    const unmountWrapper = mount(RouterView, { global: { plugins: [unmountRouter], stubs: controls } });
    void store.load('client-a');
    await flushPromises();
    unmountWrapper.unmount();
    expect(catalogSignals[1]?.aborted).toBe(true);

    const history = {
      blueprint_id: 'root-a',
      origin: 'BOOTSTRAPPED',
      versions: [
        { ...version, state: 'DRAFT' as const, disposition: 'DISCARDED', replacement_version_id: approvedBase.version_id },
        approvedBase
      ],
      current_exception: null
    };
    const panel = mount(RootHistoryPanel, {
      props: { root: history, history, authenticatedSubjectId: 'subject-a' },
      global: { stubs: controls }
    });
    expect(panel.text()).toContain(`replacement ${approvedBase.version_id}`);
    expect(panel.find('[data-test="review-version"]').exists()).toBe(false);
  });

  it.each([403, 404])(
    'clears prior same-client projections, preview, receipts, and retry authority after catalog denial %s',
    async (status) => {
      const catalog = {
        catalog_version: 'workflow-builder-capability-catalog-v1',
        archetypes: ['basic-verification@1'],
        packs: {},
        atoms: [],
        archetype_facts: {}
      };
      const root = { blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [version], current_exception: null };
      const materialization = {
        candidate: {
          lifecycle: 'DRAFT' as const,
          selected_atom_keys: [],
          locked_atom_keys: [],
          expansion_trace: [],
          capability_states: {},
          dependencies: [],
          diagnostics: []
        },
        canonical_bytes: '{"server":"preview"}',
        digest: 'sha256:preview',
        diagnostics: []
      };
      api.catalog.mockResolvedValue(response(catalog, '"catalog-etag"'));
      api.root.mockResolvedValue(response(root, '"root-etag"'));
      api.versions.mockResolvedValue(response(root, '"history-etag"'));
      api.materialize.mockResolvedValue(response(materialization, '"material-etag"'));
      api.exceptionContext.mockResolvedValue(response({ base_version: approvedBase, current: null }, '"context-etag"'));
      api.exceptions.mockResolvedValue(response({ exceptions: [exception], current_exception: exception }, '"exceptions-etag"'));
      api.bootstrap.mockResolvedValue(response(root, '"bootstrap-etag"'));
      const store = useWorkflowBuilderStore();

      await store.load('client-a');
      await store.preview({
        schema_version: 'assisted-authoring-v1',
        catalog_version: catalog.catalog_version,
        archetype_key: 'basic-verification@1'
      });
      await store.loadExceptionContext('clinic-a', approvedBase.version_id);
      await store.loadExceptionHistory('clinic-a');
      const receipt = await store.bootstrap('basic-verification@1');
      expect(store.catalog).not.toBeNull();
      expect(store.root).not.toBeNull();
      expect(store.history).not.toBeNull();
      expect(store.materialization?.canonical_bytes).toContain('server');
      expect(store.exceptionContext).not.toBeNull();
      expect(store.exceptionHistory).not.toBeNull();
      expect(store.receipts).toHaveLength(1);

      let resolveRoot!: (value: ReturnType<typeof response>) => void;
      let resolveHistory!: (value: ReturnType<typeof response>) => void;
      api.catalog.mockRejectedValueOnce(new WorkflowBuilderHttpError(status, null, null, new Headers(), 'denied'));
      api.root.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRoot = resolve;
          })
      );
      api.versions.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveHistory = resolve;
          })
      );

      await store.load('client-a');

      expect(store.error).toBe('Workflow Builder is unavailable for this client.');
      expect(store.catalog).toBeNull();
      expect(store.catalogEtag).toBeNull();
      expect(store.root).toBeNull();
      expect(store.rootEtag).toBeNull();
      expect(store.history).toBeNull();
      expect(store.historyEtag).toBeNull();
      expect(store.materialization).toBeNull();
      expect(store.exceptionContext).toBeNull();
      expect(store.exceptionHistory).toBeNull();
      expect(store.receipts).toEqual([]);
      await expect(receipt.retry()).rejects.toThrow('no longer active');
      expect(api.bootstrap).toHaveBeenCalledTimes(1);

      resolveRoot(response(root, '"late-root-etag"'));
      resolveHistory(response(root, '"late-history-etag"'));
      await flushPromises();
      expect(store.root).toBeNull();
      expect(store.history).toBeNull();
    }
  );

  it.each([403, 404])('revokes client projections and receipt authority when a builder command is denied %s', async (status) => {
    const catalog = {
      catalog_version: 'workflow-builder-capability-catalog-v1',
      archetypes: ['basic-verification@1'],
      packs: {},
      atoms: [],
      archetype_facts: {}
    };
    const root = { blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [version], current_exception: null };
    const materialization = {
      candidate: {
        lifecycle: 'DRAFT' as const,
        selected_atom_keys: [],
        locked_atom_keys: [],
        expansion_trace: [],
        capability_states: {},
        dependencies: [],
        diagnostics: []
      },
      canonical_bytes: '{"server":"preview"}',
      digest: 'sha256:preview',
      diagnostics: []
    };
    const previewRequest = {
      schema_version: 'assisted-authoring-v1' as const,
      catalog_version: catalog.catalog_version,
      archetype_key: 'basic-verification@1'
    };
    api.catalog.mockResolvedValue(response(catalog, '"catalog-etag"'));
    api.root.mockResolvedValue(response(root, '"root-etag"'));
    api.versions.mockResolvedValue(response(root, '"history-etag"'));
    api.materialize.mockResolvedValue(response(materialization, '"material-etag"'));
    api.exceptionContext.mockResolvedValue(response({ base_version: approvedBase, current: null }, '"context-etag"'));
    api.exceptions.mockResolvedValue(response({ exceptions: [exception], current_exception: exception }, '"exceptions-etag"'));
    api.bootstrap.mockResolvedValue(response(root, '"bootstrap-etag"'));
    api.version.mockResolvedValue(response(version, '"version-etag"'));
    api.transitionVersion.mockRejectedValue(new WorkflowBuilderHttpError(status, null, null, new Headers(), 'denied'));
    const store = useWorkflowBuilderStore();

    await store.load('client-a');
    await store.preview(previewRequest);
    await store.loadExceptionContext('clinic-a', approvedBase.version_id);
    await store.loadExceptionHistory('clinic-a');
    const receipt = await store.bootstrap('basic-verification@1');
    expect(store.catalog).not.toBeNull();
    expect(store.materialization).not.toBeNull();
    expect(store.receipts).toHaveLength(1);

    await expect(store.approveVersion(version.version_id)).rejects.toMatchObject({ status });

    expect(store.error).toBe('Workflow Builder is unavailable for this client.');
    expect(store.catalog).toBeNull();
    expect(store.catalogEtag).toBeNull();
    expect(store.root).toBeNull();
    expect(store.rootEtag).toBeNull();
    expect(store.history).toBeNull();
    expect(store.historyEtag).toBeNull();
    expect(store.materialization).toBeNull();
    expect(store.exceptionContext).toBeNull();
    expect(store.exceptionHistory).toBeNull();
    expect(store.receipts).toEqual([]);
    await expect(receipt.retry()).rejects.toThrow('no longer active');
    expect(api.transitionVersion).toHaveBeenCalledTimes(1);

    api.catalog.mockResolvedValue(response(catalog, '"catalog-2"'));
    api.root.mockResolvedValue(response(root, '"root-2"'));
    api.versions.mockResolvedValue(response(root, '"history-2"'));
    api.version.mockRejectedValue(new WorkflowBuilderHttpError(status, null, null, new Headers(), 'denied'));
    await store.load('client-a');
    await store.preview(previewRequest);
    expect(store.materialization).not.toBeNull();

    await expect(store.approveVersion(version.version_id)).rejects.toMatchObject({ status });

    expect(store.catalog).toBeNull();
    expect(store.materialization).toBeNull();
    expect(store.receipts).toEqual([]);
    expect(api.transitionVersion).toHaveBeenCalledTimes(1);

    api.version.mockResolvedValue(response(version, '"version-etag"'));
    await store.load('client-a');
    expect(store.error).toBeNull();
    expect(store.catalog).not.toBeNull();
    expect(store.root).not.toBeNull();
  });

  it('rejects a stale client command before transport and ignores a late exception context after cancel', async () => {
    let resolveContext!: (value: ReturnType<typeof response>) => void;
    let resolveVersion!: (value: ReturnType<typeof response>) => void;
    api.exceptionContext.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveContext = resolve;
      })
    );
    api.version.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveVersion = resolve;
      })
    );
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');
    const pendingContext = store.loadExceptionContext('clinic-a', approvedBase.version_id);
    const pendingApproval = store.approveVersion(version.version_id);
    store.cancel();
    store.selectClient('client-b');
    resolveContext(response({ base_version: approvedBase, current: null }, '"context-etag"'));
    resolveVersion(response(version, '"version-etag"'));
    await pendingContext;

    await expect(pendingApproval).rejects.toThrow('no longer active');
    expect(store.exceptionContext).toBeNull();
    expect(api.transitionVersion).not.toHaveBeenCalled();
  });

  it('walks the full mocked journey and recovers from 409 then 412 by replaying the exact original command', async () => {
    const catalog = {
      catalog_version: 'workflow-builder-capability-catalog-v1',
      archetypes: ['basic-verification@1'],
      packs: {},
      atoms: ['plan-note'],
      archetype_facts: { 'basic-verification@1': { capability_states: { 'plan-note': 'OPTIONAL' }, dependencies: [] } }
    };
    const draftVersion = { ...version, state: 'DRAFT' as const };
    const materialization = {
      candidate: { lifecycle: 'DRAFT' as const },
      canonical_bytes: '{"lifecycle":"DRAFT"}',
      digest: 'sha256:journey',
      diagnostics: []
    };
    const root = { blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [], current_exception: null };
    let versions: WorkflowBlueprintVersion[] = [];
    let exceptions: WorkflowBlueprintException[] = [];
    let versionEtag = '"version-draft"';
    let exceptionEtag = '"exception-draft"';
    let exceptionApprovals = 0;
    api.catalog.mockResolvedValue(response(catalog, '"catalog-1"'));
    api.root
      .mockRejectedValueOnce(new WorkflowBuilderHttpError(404, null, null, new Headers(), 'absent root'))
      .mockResolvedValue(response(root, '"root-1"'));
    api.versions.mockImplementation(() => Promise.resolve(response({ ...root, versions }, `"history-${versions.length}"`)));
    api.bootstrap.mockResolvedValue(response(root, '"root-1"'));
    api.materialize.mockResolvedValue(response(materialization, '"material-1"'));
    api.createVersion.mockImplementation(async () => {
      versions = [draftVersion];
      return response({ version_id: draftVersion.version_id }, '"root-2"');
    });
    api.version.mockImplementation(() => Promise.resolve(response(versions[0] ?? draftVersion, versionEtag)));
    api.transitionVersion.mockImplementation(async (_client, _versionId, _command, action) => {
      versionEtag = action === 'review' ? '"version-in-review"' : '"version-approved"';
      versions = action === 'review' ? [{ ...version, state: 'IN_REVIEW' as const }] : [approvedBase];
      return response({}, '"version-transitioned"');
    });
    api.exceptionContext.mockResolvedValue(response({ base_version: approvedBase, current: null }, '"context-1"'));
    api.exceptions.mockImplementation(() =>
      Promise.resolve(response({ exceptions, current_exception: exceptions[0] ?? null }, `"exceptions-${exceptions.length}"`))
    );
    api.exception.mockImplementation(() => Promise.resolve(response(exceptions[0] ?? exception, exceptionEtag)));
    api.createException.mockImplementation(async () => {
      exceptions = [{ ...exception, state: 'DRAFT' as const }];
      return response({ exception_id: exception.exception_id }, '"exception-created"');
    });
    api.transitionException.mockImplementation(async (_client, _clinicId, _exceptionId, _command, action) => {
      if (action === 'review') {
        exceptionEtag = '"exception-in-review"';
        exceptions = [{ ...exception, state: 'IN_REVIEW' as const }];
        return response({}, '"exception-reviewed"');
      }
      exceptionApprovals += 1;
      if (exceptionApprovals === 1) throw new WorkflowBuilderHttpError(409, null, null, new Headers(), 'conflict');
      if (exceptionApprovals === 2) throw new WorkflowBuilderHttpError(412, null, null, new Headers(), 'stale');
      exceptions = [{ ...exception, state: 'APPROVED' as const }];
      return response({}, '"exception-approved"');
    });

    vi.stubGlobal(
      'fetch',
      storeFetchMock({
        clients: [{ id: 'client-a', client_name: 'Client A' }],
        clinics: [{ id: 'clinic-a', clinic_name: 'Clinic A' }]
      })
    );
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/workflow', component: WorkflowBuilder }] });
    await router.push('/workflow');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router], stubs: controls } });
    const store = useWorkflowBuilderStore();
    const click = async (label: string) => {
      await wrapper
        .findAll('button')
        .find((candidate) => candidate.text().includes(label))!
        .trigger('click');
      await flushPromises();
    };
    const retry = async () => {
      const buttons = wrapper.findAll('[data-test="retry-receipt"]');
      await buttons[buttons.length - 1]!.trigger('click');
      await flushPromises();
    };

    await flushPromises();
    const clientSelect = wrapper.get('[data-test="load-client"]');
    expect(clientSelect.findAll('option').map((option) => option.text())).toEqual(['Client A']);
    await clientSelect.setValue('client-a');
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();
    expect(api.catalog).toHaveBeenCalledTimes(1);
    expect(
      wrapper
        .get('[data-test="exception-clinic-id"]')
        .findAll('option')
        .map((option) => option.text())
    ).toEqual(['Clinic A']);

    await click('Initialize absent root');
    expect(api.bootstrap.mock.calls[0]?.[1]).toMatchObject({ body: { archetype_key: 'basic-verification@1' }, ifNoneMatch: '*' });

    await click('Preview server draft');
    expect(api.materialize.mock.calls[0]?.[1]).toMatchObject({ archetype_key: 'basic-verification@1' });
    expect(store.materialization?.digest).toBe('sha256:journey');

    await click('Create non-activating draft');
    expect(api.createVersion.mock.calls[0]?.[1]).toMatchObject({
      body: { contract_version: 'assisted-authoring-v1', canonical_bytes: '{"lifecycle":"DRAFT"}', digest: 'sha256:journey' },
      ifMatch: '"root-1"'
    });

    await click('Submit review');
    await click('Request personal approval');
    const versionTransitions = api.transitionVersion.mock.calls;
    expect(versionTransitions.map((call) => call[3])).toEqual(['review', 'approval']);
    expect(versionTransitions[0]?.[2]).toMatchObject({ body: {}, ifMatch: '"version-draft"' });
    expect(versionTransitions[1]?.[2]).toMatchObject({ body: {}, ifMatch: '"version-in-review"' });
    expect(versionTransitions[0]?.[2].idempotencyKey).not.toBe(versionTransitions[1]?.[2].idempotencyKey);
    expect(store.history?.versions[0]?.state).toBe('APPROVED');

    await wrapper.get('[data-test="exception-clinic-id"]').setValue('clinic-a');
    await wrapper.get('[data-test="exception-base-version"]').setValue(approvedBase.version_id);
    await wrapper.get('[data-test="exception-rationale"]').setValue('clinic-specific requirement');
    await wrapper.get('[data-test="exception-add-plan-note"]').setValue(true);
    await wrapper.get('[data-test="load-exception-context"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-test="create-exception"]').trigger('click');
    await flushPromises();
    expect(api.createException.mock.calls[0]?.slice(0, 2)).toEqual(['client-a', 'clinic-a']);
    expect(api.createException.mock.calls[0]?.[2]).toMatchObject({
      body: {
        base_version_id: approvedBase.version_id,
        add_atom_keys: ['plan-note'],
        remove_atom_keys: [],
        rationale: 'clinic-specific requirement'
      },
      ifMatch: '"context-1"'
    });

    await wrapper.get('[data-test="review-exception"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-test="approve-exception"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Correct the current Workflow Builder state before trying again.');
    expect(store.receipts[store.receipts.length - 1]).toMatchObject({ outcome: 'FAILED', failure: 'CONFLICT' });

    const refreshesBeforeRecovery = api.catalog.mock.calls.length;
    await retry();
    expect(wrapper.text()).toContain('Workflow Builder changed on the server. Refreshing the current state.');
    expect(api.catalog.mock.calls.length).toBe(refreshesBeforeRecovery + 1);
    expect(store.receipts[store.receipts.length - 1]).toMatchObject({ outcome: 'FAILED', failure: 'STALE' });

    await retry();
    expect(store.receipts[store.receipts.length - 1]).toMatchObject({ outcome: 'SUCCEEDED' });
    const exceptionTransitions = api.transitionException.mock.calls;
    expect(exceptionTransitions.map((call) => call[4])).toEqual(['review', 'approval', 'approval', 'approval']);
    expect(exceptionTransitions[1]?.[3]).toMatchObject({ body: {}, ifMatch: '"exception-in-review"' });
    expect(exceptionTransitions[2]?.[3]).toBe(exceptionTransitions[1]?.[3]);
    expect(exceptionTransitions[3]?.[3]).toBe(exceptionTransitions[1]?.[3]);
    wrapper.unmount();
  });

  it('drives client and clinic selection from the authenticated stores instead of typed IDs', async () => {
    const fetchMock = storeFetchMock({
      clients: [
        { id: 'client-a', client_name: 'Client A' },
        { id: 'client-b', client_name: 'Client B' }
      ],
      clinics: [{ id: 'clinic-b', clinic_name: 'Clinic B' }]
    });
    vi.stubGlobal('fetch', fetchMock);
    api.catalog.mockResolvedValue(
      response(
        { catalog_version: 'workflow-builder-capability-catalog-v1', archetypes: [], packs: {}, atoms: [], archetype_facts: {} },
        '"catalog"'
      )
    );
    api.root.mockResolvedValue(
      response({ blueprint_id: 'root-b', origin: 'BOOTSTRAPPED', versions: [], current_exception: null }, '"root"')
    );
    api.versions.mockResolvedValue(
      response({ blueprint_id: 'root-b', origin: 'BOOTSTRAPPED', versions: [], current_exception: null }, '"history"')
    );
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/workflow', component: WorkflowBuilder }] });
    await router.push('/workflow');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router], stubs: controls } });
    await flushPromises();

    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toContain(`${import.meta.env.VITE_API_URL}/clients`);
    const clientSelect = wrapper.get('[data-test="load-client"]');
    expect(clientSelect.findAll('option').map((option) => option.text())).toEqual(['Client A', 'Client B']);
    expect(wrapper.get('[data-test="exception-clinic-id"]').findAll('option')).toHaveLength(0);

    await clientSelect.setValue('client-b');
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();

    expect(api.catalog.mock.calls[0]?.[0]).toBe('client-b');
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toContain(`${import.meta.env.VITE_API_URL}/clients/client-b/clinics`);
    expect(
      wrapper
        .get('[data-test="exception-clinic-id"]')
        .findAll('option')
        .map((option) => option.text())
    ).toEqual(['Clinic B']);
  });

  it('prefills optional atoms from server archetype facts and hides bootstrap once the root exists', async () => {
    const composerCatalog: WorkflowBuilderCatalog = {
      catalog_version: 'workflow-builder-capability-catalog-v1',
      archetypes: ['basic-verification@1'],
      packs: {},
      atoms: ['appointment-note', 'plan-note'],
      archetype_facts: {
        'basic-verification@1': {
          selected_atom_keys: ['appointment-note', 'plan-note'],
          locked_atom_keys: ['appointment-note'],
          capability_states: { 'appointment-note': 'REQUIRED', 'plan-note': 'OPTIONAL' },
          dependencies: []
        }
      }
    };
    const wrapper = mount(CatalogComposerPanel, {
      props: { catalog: composerCatalog, loading: false, rootExists: false },
      global: { stubs: controls }
    });
    expect((wrapper.get('[data-test="atom-plan-note"]').element as HTMLInputElement).checked).toBe(true);

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Preview server draft'))!
      .trigger('click');
    await flushPromises();
    expect(wrapper.emitted('preview')).toEqual([
      [
        {
          schema_version: 'assisted-authoring-v1',
          catalog_version: composerCatalog.catalog_version,
          archetype_key: 'basic-verification@1',
          selected_pack_keys: [],
          selected_atom_keys: ['plan-note'],
          removed_atom_keys: []
        }
      ]
    ]);
    expect(wrapper.find('[data-test="bootstrap-root"]').exists()).toBe(true);

    const rooted = mount(CatalogComposerPanel, {
      props: { catalog: composerCatalog, loading: false, rootExists: true },
      global: { stubs: controls }
    });
    expect(rooted.find('[data-test="bootstrap-root"]').exists()).toBe(false);
    expect((rooted.get('[data-test="atom-plan-note"]').element as HTMLInputElement).checked).toBe(true);
  });

  it('passes explicit server-selected atom removals through the authoritative materialize payload', async () => {
    const composerCatalog: WorkflowBuilderCatalog = {
      catalog_version: 'workflow-builder-capability-catalog-v1',
      archetypes: ['basic-verification@1'],
      packs: {},
      atoms: ['appointment-note', 'plan-note', 'subscriber-note'],
      archetype_facts: {
        'basic-verification@1': {
          selected_atom_keys: ['appointment-note', 'plan-note', 'subscriber-note'],
          locked_atom_keys: ['appointment-note'],
          capability_states: { 'appointment-note': 'REQUIRED', 'plan-note': 'OPTIONAL', 'subscriber-note': 'OPTIONAL' },
          dependencies: []
        }
      }
    };
    const wrapper = mount(CatalogComposerPanel, {
      props: { catalog: composerCatalog, loading: false, rootExists: true },
      global: { stubs: controls }
    });
    expect((wrapper.get('[data-test="atom-plan-note"]').element as HTMLInputElement).checked).toBe(true);

    await wrapper.get('[data-test="atom-plan-note"]').setValue(false);
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Preview server draft'))!
      .trigger('click');
    await flushPromises();

    expect(wrapper.emitted('preview')).toEqual([
      [
        {
          schema_version: 'assisted-authoring-v1',
          catalog_version: composerCatalog.catalog_version,
          archetype_key: 'basic-verification@1',
          selected_pack_keys: [],
          selected_atom_keys: ['subscriber-note'],
          removed_atom_keys: ['plan-note']
        }
      ]
    ]);

    await wrapper.get('[data-test="atom-plan-note"]').setValue(true);
    await wrapper.get('[data-test="atom-subscriber-note"]').setValue(false);
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Preview server draft'))!
      .trigger('click');
    await flushPromises();

    expect(wrapper.emitted('preview')?.[1]).toEqual([
      {
        schema_version: 'assisted-authoring-v1',
        catalog_version: composerCatalog.catalog_version,
        archetype_key: 'basic-verification@1',
        selected_pack_keys: [],
        selected_atom_keys: ['plan-note'],
        removed_atom_keys: ['subscriber-note']
      }
    ]);
  });

  it('renders returned candidate evaluation detail and omits candidate groups the server did not return', () => {
    const materialization: WorkflowBuilderMaterialization = {
      candidate: {
        lifecycle: 'DRAFT',
        selected_atom_keys: ['appointment-note', 'plan-note'],
        locked_atom_keys: ['appointment-note'],
        expansion_trace: [{ source_key: 'custom-notes@1', added_atom_keys: ['plan-note', 'subscriber-note'] }],
        capability_states: { 'appointment-note': 'REQUIRED', 'plan-note': 'OPTIONAL' },
        dependencies: [
          { key: 'plan-note', status: 'SATISFIED' },
          { key: 'plan-create', status: 'FORBIDDEN' }
        ],
        diagnostics: []
      },
      canonical_bytes: '{"lifecycle":"DRAFT"}',
      digest: 'sha256:preview',
      diagnostics: []
    };
    const wrapper = mount(PreviewDraftPanel, {
      props: { materialization, rootEtag: '"root"', loading: false },
      global: { stubs: controls }
    });

    expect(wrapper.get('[data-test="candidate-selected-atoms"]').text()).toContain('plan-note');
    expect(wrapper.get('[data-test="candidate-locked-atoms"]').text()).toContain('appointment-note');
    expect(wrapper.get('[data-test="candidate-dependencies"]').text()).toContain('plan-note: SATISFIED');
    expect(wrapper.get('[data-test="candidate-dependencies"]').text()).toContain('plan-create: FORBIDDEN');
    expect(wrapper.get('[data-test="candidate-expansion-entry"]').text()).toContain(
      'custom-notes@1 added 2 atom(s): plan-note, subscriber-note'
    );

    const sparse = mount(PreviewDraftPanel, {
      props: {
        materialization: {
          candidate: {
            lifecycle: 'DRAFT',
            selected_atom_keys: [],
            locked_atom_keys: [],
            expansion_trace: [],
            capability_states: {},
            dependencies: [],
            diagnostics: []
          },
          canonical_bytes: null,
          digest: null,
          diagnostics: []
        },
        rootEtag: null,
        loading: false
      },
      global: { stubs: controls }
    });
    expect(sparse.find('[data-test="candidate-detail"]').exists()).toBe(false);
  });

  it('refreshes the exception context ETag after create and approval without changing the approval command', async () => {
    const contextEtags = ['"context-1"', '"context-2"', '"context-3"'];
    api.catalog.mockResolvedValue(
      response(
        {
          catalog_version: 'workflow-builder-capability-catalog-v1',
          archetypes: ['basic-verification@1'],
          packs: {},
          atoms: ['plan-note'],
          archetype_facts: {
            'basic-verification@1': {
              selected_atom_keys: [],
              locked_atom_keys: [],
              capability_states: { 'plan-note': 'OPTIONAL' },
              dependencies: []
            }
          }
        },
        '"catalog"'
      )
    );
    api.root.mockResolvedValue(
      response({ blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [], current_exception: null }, '"root"')
    );
    api.versions.mockResolvedValue(
      response({ blueprint_id: 'root-a', origin: 'BOOTSTRAPPED', versions: [approvedBase], current_exception: null }, '"history"')
    );
    api.exceptionContext.mockImplementation(() =>
      Promise.resolve(response({ base_version: approvedBase, current: null }, contextEtags.shift() ?? '"context-4"'))
    );
    api.createException.mockResolvedValue(response({ ...exception, state: 'DRAFT' }, '"exception-created"'));
    api.exceptions.mockResolvedValue(response({ exceptions: [exception], current_exception: exception }, '"exceptions-etag"'));
    api.exception.mockResolvedValue(response(exception, '"exception-etag"'));
    api.transitionException.mockResolvedValue(response({ ...exception, state: 'APPROVED' }, '"exception-approved"'));
    vi.stubGlobal(
      'fetch',
      storeFetchMock({
        clients: [{ id: 'client-a', client_name: 'Client A' }],
        clinics: [{ id: 'clinic-a', clinic_name: 'Clinic A' }]
      })
    );
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/workflow', component: WorkflowBuilder }] });
    await router.push('/workflow');
    await router.isReady();
    const wrapper = mount(RouterView, { global: { plugins: [router], stubs: controls } });
    await flushPromises();
    await wrapper.get('[data-test="load-client"]').setValue('client-a');
    await wrapper.get('[data-test="load-client-button"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-test="exception-clinic-id"]').setValue('clinic-a');
    await wrapper.get('[data-test="exception-base-version"]').setValue(approvedBase.version_id);
    await wrapper.get('[data-test="load-exception-context"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-test="exception-rationale"]').setValue('clinic-specific requirement');
    await wrapper.get('[data-test="exception-add-plan-note"]').setValue(true);
    await wrapper.get('[data-test="create-exception"]').trigger('click');
    await flushPromises();
    expect(api.createException.mock.calls[0]?.[2]).toMatchObject({ ifMatch: '"context-1"' });
    expect(api.exceptionContext).toHaveBeenCalledTimes(2);
    expect(api.exceptionContext.mock.calls[1]?.slice(0, 3)).toEqual(['client-a', 'clinic-a', approvedBase.version_id]);

    await wrapper.get('[data-test="approve-exception"]').trigger('click');
    await flushPromises();
    expect(api.exceptionContext).toHaveBeenCalledTimes(3);

    await wrapper.get('[data-test="create-exception"]').trigger('click');
    await flushPromises();
    expect(api.createException).toHaveBeenCalledTimes(2);
    expect(api.createException.mock.calls[1]?.[2]).toMatchObject({ ifMatch: '"context-3"' });
    expect(api.transitionException).toHaveBeenCalledWith(
      'client-a',
      'clinic-a',
      exception.exception_id,
      expect.objectContaining({ body: {}, ifMatch: '"exception-etag"' }),
      'approval'
    );
    wrapper.unmount();
  });
});
