import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const authStoreMock = {
  access_token: 'access-token-1',
  user: { id: 'user-1' },
  refresh: vi.fn(),
};

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStoreMock,
}));

vi.mock('@/router', () => ({
  router: {
    push: vi.fn(),
  },
}));

function response(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchWrapper request coordination', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authStoreMock.access_token = 'access-token-1';
    authStoreMock.refresh.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shares an identical in-flight GET request', async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.mocked(fetch).mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );

    const firstRequest = fetchWrapper.get('/api/v1/queue/stats');
    const secondRequest = fetchWrapper.get('/api/v1/queue/stats');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(response(200, { data: { total: 3 } }));

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { total: 3 },
      { total: 3 },
    ]);
  });

  it('shares one token refresh across concurrent 401 responses', async () => {
    let resolveRefresh!: () => void;
    authStoreMock.refresh.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce(response(401, { message: 'Expired' }))
      .mockResolvedValueOnce(response(401, { message: 'Expired' }))
      .mockImplementation(() => Promise.resolve(response(200, { data: { ok: true } })));

    const firstRequest = fetchWrapper.get('/api/v1/queue/one');
    const secondRequest = fetchWrapper.get('/api/v1/queue/two');

    await Promise.resolve();
    expect(authStoreMock.refresh).toHaveBeenCalledTimes(1);

    resolveRefresh();

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
