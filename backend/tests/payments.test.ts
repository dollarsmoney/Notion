import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryChain } from './helpers';

vi.mock('../src/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn(), rpc: vi.fn() },
  supabaseAuth: { auth: { getUser: vi.fn() } },
}));
vi.mock('../src/services/paystack', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/services/paystack')>()),
  verifyTransaction: vi.fn(),
}));

const { supabaseAdmin } = await import('../src/lib/supabase');
const { verifyTransaction, isValidWebhookSignature } = await import('../src/services/paystack');
const { finalizePayment } = await import('../src/services/orders');

const REFERENCE = 'mkt_abc123_deadbeef';
const ORDER_ID = 'order-1';

const pendingPayment = {
  id: 'pay-1',
  order_id: ORDER_ID,
  reference: REFERENCE,
  amount: 5000,
  currency: 'NGN',
  status: 'pending',
};

const orderUpdates: Record<string, unknown>[] = [];

function mockDb(payment: Record<string, unknown>, orderStatus = 'pending') {
  orderUpdates.length = 0;
  vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
    if (table === 'payments') return queryChain({ data: payment });
    const chain = queryChain({ data: { id: ORDER_ID, status: orderStatus, order_items: [] } });
    const update = chain.update as ReturnType<typeof vi.fn>;
    update.mockImplementation((payload: Record<string, unknown>) => {
      orderUpdates.push(payload);
      return chain;
    });
    return chain;
  }) as never);
  vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: null, error: null } as never);
}

describe('finalizePayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks the order paid only when Paystack reports success with a matching amount', async () => {
    mockDb(pendingPayment);
    vi.mocked(verifyTransaction).mockResolvedValue({
      status: 'success',
      amount: 500000,
      currency: 'NGN',
      reference: REFERENCE,
      gateway_response: 'Successful',
      paid_at: '2026-01-02T00:00:00Z',
    } as never);

    const result = await finalizePayment(REFERENCE);

    expect(result.status).toBe('success');
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('mark_order_paid', { p_order_id: ORDER_ID });
  });

  it('does not mark the order paid when Paystack reports a failure', async () => {
    mockDb(pendingPayment);
    vi.mocked(verifyTransaction).mockResolvedValue({
      status: 'failed',
      amount: 500000,
      currency: 'NGN',
      reference: REFERENCE,
      gateway_response: 'Declined by bank',
      paid_at: null,
    } as never);

    const result = await finalizePayment(REFERENCE);

    expect(result.status).toBe('failed');
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
    expect(orderUpdates).toContainEqual({ status: 'failed' });
  });

  // An abandoned checkout link stays live, so the order must remain pending
  // rather than being closed out as failed.
  it('leaves the order pending when the checkout was abandoned', async () => {
    mockDb(pendingPayment);
    vi.mocked(verifyTransaction).mockResolvedValue({
      status: 'abandoned',
      amount: 500000,
      currency: 'NGN',
      reference: REFERENCE,
      gateway_response: null,
      paid_at: null,
    } as never);

    const result = await finalizePayment(REFERENCE);

    expect(result.status).toBe('abandoned');
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
    expect(orderUpdates).not.toContainEqual({ status: 'failed' });
  });

  // The buyer retried on the same reference and it went through.
  it('settles an order that had already been marked failed', async () => {
    mockDb({ ...pendingPayment, status: 'failed' }, 'failed');
    vi.mocked(verifyTransaction).mockResolvedValue({
      status: 'success',
      amount: 500000,
      currency: 'NGN',
      reference: REFERENCE,
      gateway_response: 'Successful',
      paid_at: '2026-01-02T00:00:00Z',
    } as never);

    const result = await finalizePayment(REFERENCE);

    expect(result.status).toBe('success');
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('mark_order_paid', { p_order_id: ORDER_ID });
  });

  it('rejects a successful charge whose amount does not match the order total', async () => {
    mockDb(pendingPayment);
    vi.mocked(verifyTransaction).mockResolvedValue({
      status: 'success',
      amount: 100,
      currency: 'NGN',
      reference: REFERENCE,
      gateway_response: 'Successful',
      paid_at: '2026-01-02T00:00:00Z',
    } as never);

    await expect(finalizePayment(REFERENCE)).rejects.toMatchObject({ statusCode: 409 });
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it('is idempotent for an already verified payment', async () => {
    mockDb({ ...pendingPayment, status: 'success' }, 'paid');

    const result = await finalizePayment(REFERENCE);

    expect(result.status).toBe('success');
    expect(verifyTransaction).not.toHaveBeenCalled();
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it('fails for an unknown reference', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation((() => queryChain({ data: null })) as never);
    await expect(finalizePayment('nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('webhook signature', () => {
  it('accepts a body signed with the secret key and rejects anything else', async () => {
    const { createHmac } = await import('node:crypto');
    const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
    const valid = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex');

    expect(isValidWebhookSignature(body, valid)).toBe(true);
    expect(isValidWebhookSignature(body, 'deadbeef')).toBe(false);
    expect(isValidWebhookSignature(body, undefined)).toBe(false);
  });
});
