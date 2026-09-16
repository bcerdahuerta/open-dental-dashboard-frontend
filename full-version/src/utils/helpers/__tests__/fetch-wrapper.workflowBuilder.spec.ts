import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { fetchWrapper, WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';

const workflowBuilderApiMock = vi.hoisted(() => ({
  catalog: vi.fn(),
  root: vi.fn(),
  versions: vi.fn(),
  materialize: vi.fn(),
  bootstrap: vi.fn(),
  createVersion: vi.fn()
}));

vi.mock('@/api/workflowBuilder', () => ({ workflowBuilderApi: workflowBuilderApiMock }));

import { snapshotWorkflowCommand, useWorkflowBuilderStore } from '@/stores/workflowBuilder';
import type { WorkflowCommand } from '@/types/workflowBuilder';

const authStoreMock = {
  access_token: 'access-token-1',
  user: { id: 'user-1' },
  refresh: vi.fn()
};

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStoreMock
}));

vi.mock('@/router', () => ({
  router: { push: vi.fn() }
}));

function response(status: number, data?: unknown, headers?: Record<string, string>): Response {
  return new Response(data === undefined ? null : JSON.stringify(data), { status, headers });
}

describe('fetchWrapper Workflow Builder metadata', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authStoreMock.access_token = 'access-token-1';
    authStoreMock.refresh.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('keeps legacy body calls unchanged while metadata callers receive ETag and status', async () => {
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValueOnce(response(200, { data: { legacy: true } }))
      .mockResolvedValueOnce(response(201, { data: { version_id: 'version-1' } }, { ETag: '"version-1"' }));

    await expect(fetchWrapper.post('/api/v1/legacy', { legacy: true })).resolves.toEqual({ legacy: true });
    await expect(
      fetchWrapper.post(
        '/api/v1/blueprints',
        {},
        {
          headers: { 'Idempotency-Key': '9e1326d9-252e-45f7-9bb9-86a015a7c730', 'If-Match': '"root-1"' },
          responseMode: 'metadata'
        }
      )
    ).resolves.toMatchObject({
      data: { version_id: 'version-1' },
      status: 201,
      etag: '"version-1"'
    });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      body: JSON.stringify({ legacy: true }),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'Idempotency-Key': '9e1326d9-252e-45f7-9bb9-86a015a7c730',
        'If-Match': '"root-1"'
      })
    });
  });

  it('retains metadata and cancellation when a 401 refresh retries once', async () => {
    const controller = new AbortController();
    authStoreMock.refresh.mockImplementation(async () => {
      authStoreMock.access_token = 'access-token-2';
    });
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValueOnce(response(401, { message: 'expired' }))
      .mockResolvedValueOnce(response(200, { data: { ok: true } }, { ETag: '"root-2"' }));

    await expect(
      fetchWrapper.get(`${import.meta.env.VITE_API_URL}/blueprints/root`, undefined, {
        headers: { 'If-None-Match': '"root-1"' },
        signal: controller.signal,
        responseMode: 'metadata'
      })
    ).resolves.toMatchObject({ data: { ok: true }, status: 200, etag: '"root-2"' });

    expect(authStoreMock.refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls).toHaveLength(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options).toMatchObject({
        signal: controller.signal,
        headers: expect.objectContaining({ 'If-None-Match': '"root-1"' })
      });
    }
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer access-token-2' });
  });

  it.each([304, 403, 404, 409, 412])('throws a typed metadata error for HTTP %s', async (status) => {
    vi.mocked(fetch).mockResolvedValueOnce(
      response(status, status === 304 ? undefined : { message: `status-${status}` }, { ETag: '"current"' })
    );

    const request = fetchWrapper.get('/api/v1/blueprints/root', undefined, { responseMode: 'metadata' });

    await expect(request).rejects.toMatchObject({
      name: 'WorkflowBuilderHttpError',
      status,
      etag: '"current"',
      data: status === 304 ? null : { message: `status-${status}` }
    });
  });
});

describe('Workflow Builder command state', () => {
  const result = { data: { version_id: 'version-1' }, status: 201, etag: '"version-1"', headers: new Headers() };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('retries with the exact original key, body, and precondition without a replay flag', async () => {
    workflowBuilderApiMock.createVersion.mockResolvedValue(result);
    const store = useWorkflowBuilderStore();
    store.selectClient('client-1');

    const receipt = await store.createDraft(
      { contract_version: 'assisted-authoring-v1', canonical_bytes: '{"draft":true}', digest: 'sha256:draft' },
      '"root-1"'
    );
    await receipt.retry();

    expect(workflowBuilderApiMock.createVersion).toHaveBeenCalledTimes(2);
    const [, firstCommand] = workflowBuilderApiMock.createVersion.mock.calls[0];
    const [, retryCommand] = workflowBuilderApiMock.createVersion.mock.calls[1];
    expect(retryCommand).toBe(firstCommand);
    expect(retryCommand).toMatchObject({
      body: { contract_version: 'assisted-authoring-v1', canonical_bytes: '{"draft":true}', digest: 'sha256:draft' },
      ifMatch: '"root-1"'
    });
    expect(retryCommand).not.toHaveProperty('replay');
    const expectedSerialized = JSON.stringify({
      idempotencyKey: firstCommand.idempotencyKey,
      ifMatch: '"root-1"',
      body: { contract_version: 'assisted-authoring-v1', canonical_bytes: '{"draft":true}', digest: 'sha256:draft' }
    });
    expect(
      [firstCommand, retryCommand].map((command) =>
        JSON.stringify({
          idempotencyKey: command.idempotencyKey,
          ifMatch: command.ifMatch,
          body: command.body
        })
      )
    ).toEqual([expectedSerialized, expectedSerialized]);
    expect(store.receipts).toHaveLength(2);
  });

  it('does not project a late command receipt after a client switch', async () => {
    let resolveRequest!: (value: typeof result) => void;
    workflowBuilderApiMock.createVersion.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');

    const request = store.createDraft(
      { contract_version: 'assisted-authoring-v1', canonical_bytes: '{"draft":true}', digest: 'sha256:draft' },
      '"root-a"'
    );
    store.selectClient('client-b');
    resolveRequest(result);
    await request;

    expect(store.clientId).toBe('client-b');
    expect(store.receipts).toEqual([]);
  });

  it('clears client A receipts and rejects their retries before transport after switching to client B', async () => {
    workflowBuilderApiMock.createVersion.mockResolvedValue(result);
    const store = useWorkflowBuilderStore();
    store.selectClient('client-a');
    const receipt = await store.createDraft(
      { contract_version: 'assisted-authoring-v1', canonical_bytes: '{"draft":true}', digest: 'sha256:draft' },
      '"root-a"'
    );

    store.selectClient('client-b');

    expect(store.receipts).toEqual([]);
    await expect(receipt.retry()).rejects.toThrow('no longer active');
    expect(workflowBuilderApiMock.createVersion).toHaveBeenCalledTimes(1);
  });

  it('keeps retry material private and immutable when the caller mutates its draft input', async () => {
    workflowBuilderApiMock.createVersion.mockResolvedValue(result);
    const store = useWorkflowBuilderStore();
    const material = {
      contract_version: 'assisted-authoring-v1' as const,
      canonical_bytes: '{"draft":true}',
      digest: 'sha256:draft'
    };
    store.selectClient('client-a');
    const receipt = await store.createDraft(material, '"root-a"');
    material.canonical_bytes = '{"draft":false}';

    await receipt.retry();

    expect(receipt).not.toHaveProperty('command');
    expect(workflowBuilderApiMock.createVersion.mock.calls[1]?.[1]).toMatchObject({
      body: { contract_version: 'assisted-authoring-v1', canonical_bytes: '{"draft":true}', digest: 'sha256:draft' },
      ifMatch: '"root-a"'
    });
  });

  it('deeply snapshots the supported generic command boundary before nested caller mutation', () => {
    const command: WorkflowCommand<{ metadata: { selected: string[] } }> = {
      idempotencyKey: 'test-key',
      ifMatch: '"root-a"',
      body: { metadata: { selected: ['required'] } }
    };
    const snapshot = snapshotWorkflowCommand(command);
    command.body.metadata.selected.push('forbidden');

    expect(snapshot.body).toEqual({ metadata: { selected: ['required'] } });
    expect(Object.isFrozen(snapshot.body.metadata)).toBe(true);
    expect(Object.isFrozen(snapshot.body.metadata.selected)).toBe(true);
  });

  it('retains an admitted catalog when the root is opaque 404', async () => {
    workflowBuilderApiMock.catalog.mockResolvedValue({
      data: {
        catalog_version: 'workflow-builder-capability-catalog-v1',
        archetypes: ['basic-verification@1'],
        packs: {},
        atoms: [],
        archetype_facts: {}
      },
      status: 200,
      etag: '"catalog-a"',
      headers: new Headers()
    });
    workflowBuilderApiMock.root.mockRejectedValue(
      new WorkflowBuilderHttpError(404, { message: 'not found' }, null, new Headers(), 'not found')
    );
    workflowBuilderApiMock.versions.mockRejectedValue(
      new WorkflowBuilderHttpError(404, { message: 'not found' }, null, new Headers(), 'not found')
    );
    const store = useWorkflowBuilderStore();

    await store.load('client-a');

    expect(store.catalog?.archetypes).toEqual(['basic-verification@1']);
    expect(store.root).toBeNull();
    expect(store.error).toBeNull();
  });
});
