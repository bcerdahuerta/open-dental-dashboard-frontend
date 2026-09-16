import { defineStore } from 'pinia';
import { ref, toRaw } from 'vue';
import { workflowBuilderApi } from '@/api/workflowBuilder';
import { WorkflowBuilderHttpError } from '@/utils/helpers/fetch-wrapper';
import type {
  WorkflowAuthoringRequest,
  WorkflowBlueprintRoot,
  WorkflowBuilderCatalog,
  WorkflowBuilderMaterialization,
  WorkflowCommand,
  WorkflowCommandReceipt,
  WorkflowDraftMaterial,
  WorkflowExceptionContext,
  WorkflowExceptionDelta,
  WorkflowExceptionHistory
} from '@/types/workflowBuilder';

function commandId(): string {
  return crypto.randomUUID();
}

function unavailableError(): Error {
  return new Error('Workflow Builder is unavailable for this client.');
}

function isScopedAccessDenial(error: unknown): boolean {
  return error instanceof WorkflowBuilderHttpError && (error.status === 403 || error.status === 404);
}

function inactiveCommandError(): Error {
  return new Error('Workflow Builder command is no longer active.');
}

function commandFailure(error: unknown): 'CONFLICT' | 'STALE' | 'UNAVAILABLE' {
  if (error instanceof WorkflowBuilderHttpError && error.status === 409) return 'CONFLICT';
  if (error instanceof WorkflowBuilderHttpError && error.status === 412) return 'STALE';
  return 'UNAVAILABLE';
}

// Reactive proxies are not structuredClone-able, so snapshot through a plain deep copy first.
function plainClone<T>(value: T): T {
  if (Array.isArray(value)) {
    const raw = toRaw(value) as unknown[];
    return raw.map((item) => plainClone(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const raw = toRaw(value) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).map(([key, child]) => [key, plainClone(child)])) as unknown as T;
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function snapshotWorkflowCommand<T extends object>(command: WorkflowCommand<T>): WorkflowCommand<T> {
  return deepFreeze({ ...command, body: plainClone(command.body) }) as WorkflowCommand<T>;
}

async function preserveNotModified<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof WorkflowBuilderHttpError && error.status === 304) return null;
    throw error;
  }
}

async function preserveOpaqueRoot<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await preserveNotModified(request);
  } catch (error) {
    if (error instanceof WorkflowBuilderHttpError && error.status === 404) return null;
    throw error;
  }
}

export const useWorkflowBuilderStore = defineStore('workflowBuilder', () => {
  const clientId = ref<string | null>(null);
  const catalog = ref<WorkflowBuilderCatalog | null>(null);
  const catalogEtag = ref<string | null>(null);
  const root = ref<WorkflowBlueprintRoot | null>(null);
  const rootEtag = ref<string | null>(null);
  const history = ref<WorkflowBlueprintRoot | null>(null);
  const historyEtag = ref<string | null>(null);
  const materialization = ref<WorkflowBuilderMaterialization | null>(null);
  const exceptionContext = ref<WorkflowExceptionContext | null>(null);
  const exceptionContextEtag = ref<string | null>(null);
  const exceptionHistory = ref<WorkflowExceptionHistory | null>(null);
  const receipts = ref<WorkflowCommandReceipt<unknown>[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let epoch = 0;
  let commandScope = 0;
  let receiptSequence = 0;
  let controller: AbortController | null = null;

  function cancel(revokeCommands = true): void {
    controller?.abort();
    controller = null;
    epoch += 1;
    if (revokeCommands) commandScope += 1;
  }

  function clearClientScopedState(): void {
    catalog.value = null;
    catalogEtag.value = null;
    root.value = null;
    rootEtag.value = null;
    history.value = null;
    historyEtag.value = null;
    materialization.value = null;
    exceptionContext.value = null;
    exceptionContextEtag.value = null;
    exceptionHistory.value = null;
    receipts.value = [];
  }

  function revokeClientAccess(): void {
    cancel();
    clearClientScopedState();
    error.value = unavailableError().message;
    loading.value = false;
  }

  // A scoped denial on any builder command is fail-closed: the client loses every projection and receipt authority.
  async function revokeOnScopedDenial<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (isScopedAccessDenial(error)) revokeClientAccess();
      throw error;
    }
  }

  function selectClient(nextClientId: string | null): void {
    cancel();
    clientId.value = nextClientId;
    clearClientScopedState();
    error.value = null;
  }

  async function load(nextClientId: string): Promise<void> {
    if (clientId.value !== nextClientId) selectClient(nextClientId);
    else {
      cancel(false);
      error.value = null;
    }
    const requestEpoch = epoch;
    controller = new AbortController();
    loading.value = true;
    try {
      const [catalogResponse, rootResponse, historyResponse] = await Promise.all([
        preserveNotModified(() => workflowBuilderApi.catalog(nextClientId, controller!.signal, catalogEtag.value || undefined)),
        preserveOpaqueRoot(() => workflowBuilderApi.root(nextClientId, controller!.signal, rootEtag.value || undefined)),
        preserveOpaqueRoot(() => workflowBuilderApi.versions(nextClientId, controller!.signal, historyEtag.value || undefined))
      ]);
      if (requestEpoch !== epoch || clientId.value !== nextClientId) return;
      if (catalogResponse) {
        catalog.value = catalogResponse.data;
        catalogEtag.value = catalogResponse.etag;
      }
      if (rootResponse) {
        root.value = rootResponse.data;
        rootEtag.value = rootResponse.etag;
      }
      if (historyResponse) {
        history.value = historyResponse.data;
        historyEtag.value = historyResponse.etag;
      }
    } catch (errorValue) {
      if (requestEpoch !== epoch || clientId.value !== nextClientId) return;
      if (isScopedAccessDenial(errorValue)) revokeClientAccess();
      else error.value = unavailableError().message;
    } finally {
      if (requestEpoch === epoch) loading.value = false;
    }
  }

  async function preview(request: WorkflowAuthoringRequest): Promise<WorkflowBuilderMaterialization | null> {
    const activeClientId = clientId.value;
    if (!activeClientId) throw unavailableError();
    const requestEpoch = epoch;
    const result = await workflowBuilderApi.materialize(activeClientId, request, controller?.signal);
    if (requestEpoch !== epoch || clientId.value !== activeClientId) return null;
    materialization.value = result.data;
    return result.data;
  }

  function replacePendingReceipt<T>(
    receiptIndex: number,
    receiptId: number,
    commandClientId: string,
    capturedCommandScope: number,
    receipt: WorkflowCommandReceipt<T>
  ): void {
    const current = receipts.value[receiptIndex];
    if (
      capturedCommandScope !== commandScope ||
      commandClientId !== clientId.value ||
      current?.receiptId !== receiptId ||
      current.outcome !== 'PENDING'
    )
      return;
    receipts.value = receipts.value.map((item, index) => (index === receiptIndex ? (receipt as WorkflowCommandReceipt<unknown>) : item));
  }

  async function execute<T>(
    command: WorkflowCommand<object>,
    request: () => Promise<NonNullable<WorkflowCommandReceipt<T>['response']>>,
    commandClientId = clientId.value,
    capturedCommandScope = commandScope
  ): Promise<WorkflowCommandReceipt<T>> {
    if (!commandClientId || capturedCommandScope !== commandScope || commandClientId !== clientId.value) throw inactiveCommandError();
    const retry = () => execute(command, request, commandClientId, capturedCommandScope);
    const receiptId = ++receiptSequence;
    const pending: WorkflowCommandReceipt<T> = { receiptId, outcome: 'PENDING', retry };
    const receiptIndex = receipts.value.length;
    receipts.value = [...receipts.value, pending as WorkflowCommandReceipt<unknown>];
    try {
      const response = await revokeOnScopedDenial(request);
      const receipt: WorkflowCommandReceipt<T> = { receiptId, outcome: 'SUCCEEDED', response, retry };
      replacePendingReceipt(receiptIndex, receiptId, commandClientId, capturedCommandScope, receipt);
      return receipt;
    } catch (error) {
      const receipt: WorkflowCommandReceipt<T> = { receiptId, outcome: 'FAILED', failure: commandFailure(error), retry };
      replacePendingReceipt(receiptIndex, receiptId, commandClientId, capturedCommandScope, receipt);
      throw error;
    }
  }

  function bootstrap(archetypeKey: string): Promise<WorkflowCommandReceipt<WorkflowBlueprintRoot>> {
    const activeClientId = clientId.value;
    if (!activeClientId) return Promise.reject(unavailableError());
    const command = snapshotWorkflowCommand<{ archetype_key: string }>({
      idempotencyKey: commandId(),
      body: { archetype_key: archetypeKey },
      ifNoneMatch: '*'
    });
    return execute(command, () => workflowBuilderApi.bootstrap(activeClientId, command));
  }

  function createDraft(material: WorkflowDraftMaterial, ifMatch: string): Promise<WorkflowCommandReceipt<unknown>> {
    const activeClientId = clientId.value;
    if (!activeClientId) return Promise.reject(unavailableError());
    const command = snapshotWorkflowCommand<WorkflowDraftMaterial>({ idempotencyKey: commandId(), body: material, ifMatch });
    return execute(command, () => workflowBuilderApi.createVersion(activeClientId, command));
  }

  function activeCommandClient(): { client: string; commandEpoch: number } {
    if (!clientId.value) throw unavailableError();
    return { client: clientId.value, commandEpoch: epoch };
  }

  async function versionCommand(
    versionId: string,
    action: 'review' | 'approval' | 'discard',
    body: Record<string, never> | { reason_category: string }
  ): Promise<WorkflowCommandReceipt<unknown>> {
    const active = activeCommandClient();
    const detail = await revokeOnScopedDenial(() => workflowBuilderApi.version(active.client, versionId, controller?.signal));
    if (active.commandEpoch !== epoch || clientId.value !== active.client) throw inactiveCommandError();
    const command = snapshotWorkflowCommand({ idempotencyKey: commandId(), body: body as object, ifMatch: detail.etag || '' });
    return execute(command, () => workflowBuilderApi.transitionVersion(active.client, versionId, command, action), active.client);
  }

  function reviewVersion(versionId: string): Promise<WorkflowCommandReceipt<unknown>> {
    return versionCommand(versionId, 'review', {});
  }

  function approveVersion(versionId: string): Promise<WorkflowCommandReceipt<unknown>> {
    return versionCommand(versionId, 'approval', {});
  }

  function discardVersion(versionId: string, reasonCategory: string): Promise<WorkflowCommandReceipt<unknown>> {
    return versionCommand(versionId, 'discard', { reason_category: reasonCategory });
  }

  async function loadExceptionContext(clinicId: string, baseVersionId: string): Promise<WorkflowExceptionContext | null> {
    const active = activeCommandClient();
    const result = await workflowBuilderApi.exceptionContext(active.client, clinicId, baseVersionId, controller?.signal);
    if (active.commandEpoch !== epoch || clientId.value !== active.client) return null;
    exceptionContext.value = result.data;
    exceptionContextEtag.value = result.etag;
    return result.data;
  }

  async function loadExceptionHistory(clinicId: string): Promise<WorkflowExceptionHistory | null> {
    const active = activeCommandClient();
    const result = await workflowBuilderApi.exceptions(active.client, clinicId, controller?.signal);
    if (active.commandEpoch !== epoch || clientId.value !== active.client) return null;
    exceptionHistory.value = result.data;
    return result.data;
  }

  async function createException(
    clinicId: string,
    baseVersionId: string,
    delta: WorkflowExceptionDelta
  ): Promise<WorkflowCommandReceipt<unknown>> {
    const active = activeCommandClient();
    if (!exceptionContextEtag.value || exceptionContext.value?.base_version.version_id !== baseVersionId) throw inactiveCommandError();
    const command = snapshotWorkflowCommand({
      idempotencyKey: commandId(),
      body: { base_version_id: baseVersionId, ...delta },
      ifMatch: exceptionContextEtag.value
    });
    return execute(command, () => workflowBuilderApi.createException(active.client, clinicId, command), active.client);
  }

  async function exceptionCommand(
    clinicId: string,
    exceptionId: string,
    action: 'review' | 'approval'
  ): Promise<WorkflowCommandReceipt<unknown>> {
    const active = activeCommandClient();
    const detail = await revokeOnScopedDenial(() => workflowBuilderApi.exception(active.client, clinicId, exceptionId, controller?.signal));
    if (active.commandEpoch !== epoch || clientId.value !== active.client) throw inactiveCommandError();
    const command = snapshotWorkflowCommand({ idempotencyKey: commandId(), body: {}, ifMatch: detail.etag || '' });
    return execute(
      command,
      () => workflowBuilderApi.transitionException(active.client, clinicId, exceptionId, command, action),
      active.client
    );
  }

  function reviewException(clinicId: string, exceptionId: string): Promise<WorkflowCommandReceipt<unknown>> {
    return exceptionCommand(clinicId, exceptionId, 'review');
  }

  function approveException(clinicId: string, exceptionId: string): Promise<WorkflowCommandReceipt<unknown>> {
    return exceptionCommand(clinicId, exceptionId, 'approval');
  }

  async function refresh(): Promise<void> {
    if (clientId.value) await load(clientId.value);
  }

  return {
    clientId,
    catalog,
    catalogEtag,
    root,
    rootEtag,
    history,
    historyEtag,
    materialization,
    exceptionContext,
    exceptionHistory,
    receipts,
    loading,
    error,
    selectClient,
    load,
    preview,
    bootstrap,
    createDraft,
    reviewVersion,
    approveVersion,
    discardVersion,
    loadExceptionContext,
    loadExceptionHistory,
    createException,
    reviewException,
    approveException,
    refresh,
    cancel
  };
});
