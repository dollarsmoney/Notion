import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(async () => ({
    apiUrl: 'http://api.test',
    supabaseUrl: 'https://x.supabase.co',
    supabaseAnonKey: 'anon',
  })),
}));
vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(async () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-123' } } }) },
  })),
}));

const { api, ApiError } = await import('@/lib/api');

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('api client', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('attaches the Supabase access token as a bearer header', async () => {
    const fetchMock = mockFetch(200, { data: [] });
    await api('/api/orders');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/api/orders');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('omits the token for public requests', async () => {
    const fetchMock = mockFetch(200, { data: [] });
    await api('/api/products', { auth: false });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('surfaces the API error message', async () => {
    mockFetch(409, { error: 'Order is already paid' });
    await expect(api('/api/payments/initialize', { method: 'POST', body: {} })).rejects.toThrow(
      'Order is already paid',
    );
  });

  it('reports the status code on failure', async () => {
    mockFetch(404, { error: 'Product not found' });
    await expect(api('/api/products/x', { auth: false })).rejects.toMatchObject({
      status: 404,
      name: 'ApiError',
    });
    expect(new ApiError(500, 'boom')).toBeInstanceOf(Error);
  });

  it('returns undefined for a 204 with no body', async () => {
    mockFetch(204, null);
    await expect(api('/api/products/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
