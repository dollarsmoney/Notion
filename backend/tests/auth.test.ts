import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { buyerProfile, fromMock, vendorProfile } from './helpers';

vi.mock('../src/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
  supabaseAuth: { auth: { getUser: vi.fn() } },
}));

const { supabaseAdmin, supabaseAuth } = await import('../src/lib/supabase');
const { createApp } = await import('../src/app');

const app = createApp();

function signIn(profile: typeof vendorProfile) {
  vi.mocked(supabaseAuth.auth.getUser).mockResolvedValue({
    data: { user: { id: profile.id, email: profile.email } },
    error: null,
  } as never);
  vi.mocked(supabaseAdmin.from).mockImplementation(
    fromMock({ profiles: { data: profile } }) as never,
  );
}

describe('auth middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/api/products/mine');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/missing bearer token/i);
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/api/products/mine').set('Authorization', 'token abc');
    expect(res.status).toBe(401);
  });

  it('rejects a token Supabase does not recognise', async () => {
    vi.mocked(supabaseAuth.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'bad jwt' },
    } as never);

    const res = await request(app).get('/api/products/mine').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('rejects a valid user who is not a vendor', async () => {
    signIn(buyerProfile);
    const res = await request(app).get('/api/products/mine').set('Authorization', 'Bearer good');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/requires role: vendor/i);
  });

  it('allows a vendor through', async () => {
    vi.mocked(supabaseAuth.auth.getUser).mockResolvedValue({
      data: { user: { id: vendorProfile.id, email: vendorProfile.email } },
      error: null,
    } as never);
    vi.mocked(supabaseAdmin.from).mockImplementation(
      fromMock({ profiles: { data: vendorProfile }, products: { data: [] } }) as never,
    );

    const res = await request(app).get('/api/products/mine').set('Authorization', 'Bearer good');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
