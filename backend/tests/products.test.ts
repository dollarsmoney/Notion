import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { fromMock, queryChain, vendorProfile } from './helpers';

vi.mock('../src/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
  supabaseAuth: { auth: { getUser: vi.fn() } },
}));

const { supabaseAdmin, supabaseAuth } = await import('../src/lib/supabase');
const { createApp } = await import('../src/app');

const app = createApp();

const product = {
  id: '33333333-3333-4333-8333-333333333333',
  vendor_id: vendorProfile.id,
  name: 'Widget',
  description: 'A widget',
  price: 2500,
  image_url: null,
  stock: 4,
  status: 'active',
};

function authAsVendor() {
  vi.mocked(supabaseAuth.auth.getUser).mockResolvedValue({
    data: { user: { id: vendorProfile.id, email: vendorProfile.email } },
    error: null,
  } as never);
}

describe('products API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists active products without authentication', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      fromMock({ products: { data: [product], count: 1 } }) as never,
    );

    const res = await request(app).get('/api/products?page=1&limit=12');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('hides a product that is not active', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      fromMock({ products: { data: { ...product, status: 'draft' } } }) as never,
    );

    const res = await request(app).get(`/api/products/${product.id}`);
    expect(res.status).toBe(404);
  });

  it('rejects an anonymous create', async () => {
    const res = await request(app).post('/api/products').send({ name: 'X', price: 1, stock: 1 });
    expect(res.status).toBe(401);
  });

  it('validates the payload before touching the database', async () => {
    authAsVendor();
    vi.mocked(supabaseAdmin.from).mockImplementation(
      fromMock({ profiles: { data: vendorProfile } }) as never,
    );

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer good')
      .send({ name: '', price: -5, stock: 1.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation failed/i);
  });

  it('stamps the authenticated vendor as the owner on create', async () => {
    authAsVendor();
    let captured: Record<string, unknown> | undefined;

    vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
      if (table === 'profiles') return queryChain({ data: vendorProfile });
      const chain = queryChain({ data: product });
      (chain.insert as ReturnType<typeof vi.fn>).mockImplementation((p: Record<string, unknown>) => {
        captured = p;
        return chain;
      });
      return chain;
    }) as never);

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer good')
      .send({ name: 'Widget', price: 2500, stock: 4, status: 'active' });

    expect(res.status).toBe(201);
    expect(captured?.vendor_id).toBe(vendorProfile.id);
  });
});
