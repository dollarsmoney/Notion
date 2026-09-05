import { vi } from 'vitest';

type Result = { data?: unknown; error?: unknown; count?: number };

const CHAIN_METHODS = [
  'select', 'insert', 'update', 'delete', 'upsert',
  'eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'ilike',
  'order', 'range', 'limit', 'single', 'maybeSingle', 'returns',
] as const;

/** Minimal stand-in for the Supabase query builder: chainable and awaitable. */
export function queryChain(result: Result) {
  const chain: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) chain[method] = vi.fn(() => chain);
  chain.then = (onFulfilled: (v: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(onFulfilled, onRejected);
  return chain;
}

/** Routes `from(table)` to a queued result, so a test can script several calls. */
export function fromMock(results: Record<string, Result | Result[]>) {
  const queues = new Map<string, Result[]>(
    Object.entries(results).map(([table, r]) => [table, Array.isArray(r) ? [...r] : [r]]),
  );
  return vi.fn((table: string) => {
    const queue = queues.get(table);
    if (!queue?.length) return queryChain({ data: null, error: null });
    return queryChain(queue.length === 1 ? queue[0]! : queue.shift()!);
  });
}

export const vendorProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'vendor@example.com',
  full_name: 'Vendor One',
  role: 'vendor' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const buyerProfile = { ...vendorProfile, id: '22222222-2222-4222-8222-222222222222', email: 'buyer@example.com', role: 'user' as const };
