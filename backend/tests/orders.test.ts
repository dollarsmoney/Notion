import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fromMock, queryChain } from './helpers';

vi.mock('../src/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
  supabaseAuth: { auth: { getUser: vi.fn() } },
}));

const { supabaseAdmin } = await import('../src/lib/supabase');
const { createOrder } = await import('../src/services/orders');

const BUYER = '22222222-2222-4222-8222-222222222222';
const PRODUCT_A = '33333333-3333-4333-8333-333333333333';
const PRODUCT_B = '44444444-4444-4444-8444-444444444444';

const productA = {
  id: PRODUCT_A,
  vendor_id: '11111111-1111-4111-8111-111111111111',
  name: 'Widget',
  price: 2500.5,
  stock: 10,
  status: 'active',
};

describe('createOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prices the order from the database, ignoring any client-supplied price', async () => {
    const insertedOrder = { id: 'order-1', buyer_id: BUYER, total_amount: 5001, status: 'pending' };
    let capturedInsert: Record<string, unknown> | undefined;

    vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
      if (table === 'products') return queryChain({ data: [productA] });
      if (table === 'order_items') return queryChain({ data: null });
      const chain = queryChain({ data: insertedOrder });
      const insert = chain.insert as ReturnType<typeof vi.fn>;
      insert.mockImplementation((payload: Record<string, unknown>) => {
        capturedInsert = payload;
        return chain;
      });
      return chain;
    }) as never);

    await createOrder(BUYER, [
      { product_id: PRODUCT_A, quantity: 2, price: 1 } as never,
    ]);

    // 2 x 2500.50 from the products table, not the 1 the caller sent.
    expect(capturedInsert?.total_amount).toBe(5001);
    expect(capturedInsert?.buyer_id).toBe(BUYER);
    expect(capturedInsert?.status).toBe('pending');
  });

  it('refuses to order more than the available stock', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      fromMock({ products: { data: [{ ...productA, stock: 1 }] } }) as never,
    );

    await expect(createOrder(BUYER, [{ product_id: PRODUCT_A, quantity: 5 }])).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('only 1 left'),
    });
  });

  it('refuses products that are not active', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(
      fromMock({ products: { data: [{ ...productA, status: 'draft' }] } }) as never,
    );

    await expect(createOrder(BUYER, [{ product_id: PRODUCT_A, quantity: 1 }])).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('not for sale'),
    });
  });

  it('rejects an unknown product', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(fromMock({ products: { data: [] } }) as never);

    await expect(createOrder(BUYER, [{ product_id: PRODUCT_B, quantity: 1 }])).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects a cart containing the same product twice', async () => {
    await expect(
      createOrder(BUYER, [
        { product_id: PRODUCT_A, quantity: 1 },
        { product_id: PRODUCT_A, quantity: 2 },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
