import { useAuthStore } from '@/stores/auth';
import { router } from '@/router';

export interface FetchRequestMetadata {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseMode?: 'metadata';
}

export interface FetchMetadataResponse<T = unknown> {
  data: T;
  status: number;
  etag: string | null;
  headers: Headers;
}

export class WorkflowBuilderHttpError extends Error {
  constructor(
    readonly status: number,
    readonly data: unknown,
    readonly etag: string | null,
    readonly headers: Headers,
    message: string
  ) {
    super(message);
    this.name = 'WorkflowBuilderHttpError';
  }
}

type FetchMethod = {
  (url: string, body: object | undefined, metadata: FetchRequestMetadata): Promise<FetchMetadataResponse>;
  // Backward-compatible body-only callers retain the wrapper's historical untyped response.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (url: string, body?: object): Promise<any>;
};

export const fetchWrapper: {
  get: FetchMethod;
  post: FetchMethod;
  put: FetchMethod;
  patch: FetchMethod;
  delete: FetchMethod;
} = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  patch: request('PATCH'),
  delete: request('DELETE')
};

let isHandling403 = false;
let refreshPromise: Promise<void> | null = null;
const inFlightGetRequests = new Map<string, Promise<unknown>>();

function request(method: string): FetchMethod {
  return (async (url: string, body?: object, metadata?: FetchRequestMetadata) => {
    const authStore = useAuthStore();
    const requestKey = method === 'GET' && !metadata ? `${method}:${url}:${authStore.access_token || ''}` : null;
    const existingRequest = requestKey ? inFlightGetRequests.get(requestKey) : undefined;
    if (existingRequest) return existingRequest;

    const pendingRequest = performRequest({ authStore, method, url, body, metadata });
    if (!requestKey) return pendingRequest;

    const trackedRequest = pendingRequest.finally(() => {
      if (inFlightGetRequests.get(requestKey) === trackedRequest) inFlightGetRequests.delete(requestKey);
    });
    inFlightGetRequests.set(requestKey, trackedRequest);
    return trackedRequest;
  }) as FetchMethod;
}

async function performRequest({
  authStore,
  method,
  url,
  body,
  metadata
}: {
  authStore: ReturnType<typeof useAuthStore>;
  method: string;
  url: string;
  body?: object;
  metadata?: FetchRequestMetadata;
}) {
  const requestOptions = buildRequestOptions(method, url, authStore.access_token, body, metadata);
  let response = await fetch(url, requestOptions);

  if (response.status === 401 && authStore.user) {
    try {
      await refreshAuth(authStore);
      response = await fetch(url, buildRequestOptions(method, url, authStore.access_token, body, metadata));
    } catch {
      return Promise.reject('Session expired');
    }
  }

  if (response.status === 403 && authStore.user && !isHandling403) {
    const cloned = response.clone();
    try {
      const errorData = await cloned.json();
      if (errorData?.message?.includes('No access to module')) {
        isHandling403 = true;
        try {
          await refreshAuth(authStore);
        } catch {
          /* reject below */
        }
        router.push('/dashboard/default');
        isHandling403 = false;
      }
    } catch {
      /* reject below */
    }
  }

  return handleResponse(response, metadata?.responseMode === 'metadata');
}

function buildRequestOptions(
  method: string,
  url: string,
  token: string | null,
  body?: object,
  metadata?: FetchRequestMetadata
): RequestInit {
  const headers = { ...metadata?.headers, ...authHeader(url, token) };
  if (body) headers['Content-Type'] = 'application/json';
  return { method, headers, body: body ? JSON.stringify(body) : undefined, signal: metadata?.signal };
}

function refreshAuth(authStore: ReturnType<typeof useAuthStore>): Promise<void> {
  if (!refreshPromise)
    refreshPromise = authStore.refresh().finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function authHeader(url: string, token: string | null): Record<string, string> {
  return token && url.startsWith(import.meta.env.VITE_API_URL) ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(response: Response, includeMetadata = false) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  const unwrapped = data?.data !== undefined ? data.data : data;
  const etag = response.headers.get('ETag');

  if (!response.ok) {
    const message = (data && data.message) || response.statusText;
    if (includeMetadata) throw new WorkflowBuilderHttpError(response.status, data, etag, response.headers, message);
    return Promise.reject(message);
  }

  return includeMetadata ? { data: unwrapped, status: response.status, etag, headers: response.headers } : unwrapped;
}
