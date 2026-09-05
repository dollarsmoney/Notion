'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Alert, Spinner, StatusBadge } from '@/components/ui';
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
      <h1 className="text-2xl font-semibold tracking-tight">Order history</h1>

      {error && <Alert>{error}</Alert>}
      {orders.length === 0 && !error ? (
        <Alert kind="info">You have not placed any orders yet.</Alert>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="font-mono text-xs text-slate-500">{order.id}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <span className="font-semibold">{formatMoney(order.total_amount, order.currency)}</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {order.order_items?.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span className="text-slate-700">
                      {item.product_name} <span className="text-slate-400">× {item.quantity}</span>
                    </span>
                    <span className="text-slate-600">{formatMoney(item.subtotal, order.currency)}</span>
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
