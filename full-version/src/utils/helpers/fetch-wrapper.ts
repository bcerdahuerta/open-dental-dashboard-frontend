import { useAuthStore } from '@/stores/auth';
import { router } from '@/router';

export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  patch: request('PATCH'),
  delete: request('DELETE')
};

// Prevent concurrent 403 redirects
let isHandling403 = false;

function request(method: string) {
  return async (url: string, body?: object) => {
    const authStore = useAuthStore();

    let requestOptions: RequestInit = {
      method,
      headers: authHeader(url, authStore.access_token)
    };
    if (body) {
      (requestOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(body);
    }

    let response = await fetch(url, requestOptions);

    if (response.status === 401 && authStore.user) {
      try {
        await authStore.refresh();
        requestOptions.headers = authHeader(url, authStore.access_token);
        response = await fetch(url, requestOptions);
      } catch (e) {
        return Promise.reject('Session expired');
      }
    }

    // Handle product access 403 — sync state and redirect
    if (response.status === 403 && authStore.user && !isHandling403) {
      const cloned = response.clone();
      try {
        const errorData = await cloned.json();
        if (errorData?.message?.includes('No access to module')) {
          isHandling403 = true;
          try {
            await authStore.refresh();
          } catch (_) {
            // refresh failed — proceed to reject below
          }
          router.push('/dashboard/default');
          isHandling403 = false;
        }
      } catch (_) {
        // Not JSON — proceed normally
      }
    }

    return handleResponse(response);
  };
}

function authHeader(url: string, token: string | null): Record<string, string> {
  const isApiUrl = url.startsWith(import.meta.env.VITE_API_URL);
  if (token && isApiUrl) {
    return { Authorization: `Bearer ${token}` };
  } else {
    return {};
  }
}

async function handleResponse(response: Response) {
  const text = await response.text();
  const data = text && JSON.parse(text);

  if (!response.ok) {
    const error = (data && data.message) || response.statusText;
    return Promise.reject(error);
  }

  return data?.data !== undefined ? data.data : data;
}

