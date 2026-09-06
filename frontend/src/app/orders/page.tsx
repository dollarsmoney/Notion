'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Alert, EmptyState, Spinner, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace('/login?next=/orders');
      return;
    }
    api<{ data: Order[] }>('/api/orders')
      .then((res) => setOrders(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session, authLoading, router]);

  if (authLoading || loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Order history</h1>
        <p className="mt-1 text-sm text-slate-500">
          {orders.length} order{orders.length === 1 ? '' : 's'}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      {orders.length === 0 && !error ? (
        <EmptyState
          title="No orders yet"
          description="Once you buy something it will show up here."
          action={
            <Link href="/" className="btn btn-primary">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-slate-500">{order.id}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <span className="font-semibold tracking-tight">
                    {formatMoney(order.total_amount, order.currency)}
                  </span>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {order.order_items?.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                    <span className="text-slate-700">
                      {item.product_name}
                      <span className="ml-2 text-slate-400">x {item.quantity}</span>
                    </span>
                    <span className="shrink-0 text-slate-600">
                      {formatMoney(item.subtotal, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
