import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import type {
  WorkflowAuthoringRequest,
  WorkflowBlueprintRoot,
  WorkflowBuilderCatalog,
  WorkflowBuilderMaterialization,
  WorkflowBuilderResponse,
  WorkflowCommand,
  WorkflowDraftMaterial,
  WorkflowBlueprintException,
  WorkflowExceptionContext,
  WorkflowExceptionHistory
} from '@/types/workflowBuilder';

function headers(command: WorkflowCommand<object>): Record<string, string> {
  return {
    'Idempotency-Key': command.idempotencyKey,
    ...(command.ifMatch ? { 'If-Match': command.ifMatch } : {}),
    ...(command.ifNoneMatch ? { 'If-None-Match': command.ifNoneMatch } : {})
  };
}

function path(clientId: string, suffix = ''): string {
  return `${import.meta.env.VITE_API_URL}/workflow-builder/clients/${clientId}/blueprint${suffix}`;
}

export const workflowBuilderApi = {
  catalog(clientId: string, signal?: AbortSignal, etag?: string) {
    return fetchWrapper.get(path(clientId, '/catalog'), undefined, {
      signal,
      headers: etag ? { 'If-None-Match': etag } : {},
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<WorkflowBuilderCatalog>>;
  },

  root(clientId: string, signal?: AbortSignal, etag?: string) {
    return fetchWrapper.get(path(clientId), undefined, {
      signal,
      headers: etag ? { 'If-None-Match': etag } : {},
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<WorkflowBlueprintRoot>>;
  },

  versions(clientId: string, signal?: AbortSignal, etag?: string) {
    return fetchWrapper.get(path(clientId, '/versions'), undefined, {
      signal,
      headers: etag ? { 'If-None-Match': etag } : {},
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<WorkflowBlueprintRoot>>;
  },

  materialize(clientId: string, request: WorkflowAuthoringRequest, signal?: AbortSignal) {
    return fetchWrapper.post(
      `${import.meta.env.VITE_API_URL}/workflow-builder/clients/${clientId}/assisted-authoring/materialize`,
      request,
      {
        signal,
        responseMode: 'metadata'
      }
    ) as Promise<WorkflowBuilderResponse<WorkflowBuilderMaterialization>>;
  },

  bootstrap(clientId: string, command: WorkflowCommand<{ archetype_key: string }>) {
    return fetchWrapper.post(path(clientId), command.body, {
      headers: headers(command),
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<WorkflowBlueprintRoot>>;
  },

  createVersion(clientId: string, command: WorkflowCommand<WorkflowDraftMaterial>) {
    return fetchWrapper.post(path(clientId, '/versions'), command.body, {
      headers: headers(command),
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<unknown>>;
  },

  version(clientId: string, versionId: string, signal?: AbortSignal) {
    return fetchWrapper.get(path(clientId, `/versions/${versionId}`), undefined, {
      signal,
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<WorkflowBlueprintRoot['versions'][number]>>;
  },

  transitionVersion(clientId: string, versionId: string, command: WorkflowCommand<object>, action: 'review' | 'approval' | 'discard') {
    return fetchWrapper.post(path(clientId, `/versions/${versionId}/${action}`), command.body, {
      headers: headers(command),
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<unknown>>;
  },

  exceptionContext(clientId: string, clinicId: string, baseVersionId: string, signal?: AbortSignal) {
    return fetchWrapper.get(
      path(clientId, `/clinics/${clinicId}/exception-context?base_version_id=${encodeURIComponent(baseVersionId)}`),
      undefined,
      {
        signal,
        responseMode: 'metadata'
      }
    ) as Promise<WorkflowBuilderResponse<WorkflowExceptionContext>>;
  },

  exceptions(clientId: string, clinicId: string, signal?: AbortSignal) {
    return fetchWrapper.get(path(clientId, `/clinics/${clinicId}/exceptions`), undefined, {
      signal,
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<WorkflowExceptionHistory>>;
  },

  exception(clientId: string, clinicId: string, exceptionId: string, signal?: AbortSignal) {
    return fetchWrapper.get(path(clientId, `/clinics/${clinicId}/exceptions/${exceptionId}`), undefined, {
      signal,
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<WorkflowBlueprintException>>;
  },

  createException(clientId: string, clinicId: string, command: WorkflowCommand<object>) {
    return fetchWrapper.post(path(clientId, `/clinics/${clinicId}/exceptions`), command.body, {
      headers: headers(command),
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<unknown>>;
  },

  transitionException(
    clientId: string,
    clinicId: string,
    exceptionId: string,
    command: WorkflowCommand<object>,
    action: 'review' | 'approval'
  ) {
    return fetchWrapper.post(path(clientId, `/clinics/${clinicId}/exceptions/${exceptionId}/${action}`), command.body, {
      headers: headers(command),
      responseMode: 'metadata'
    }) as Promise<WorkflowBuilderResponse<unknown>>;
  }
};
