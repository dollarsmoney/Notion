'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Alert, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { Order, Product } from '@/lib/types';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    api<{ data: Product }>(`/api/products/${id}`, { auth: false })
      .then((res) => setProduct(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleBuy() {
    if (!session) {
      router.push(`/login?next=/products/${id}`);
      return;
    }
    setBuying(true);
    setError('');
    try {
      const order = await api<{ data: Order }>('/api/orders', {
        method: 'POST',
        body: { items: [{ product_id: id, quantity }] },
      });
      const payment = await api<{ data: { authorization_url: string } }>('/api/payments/initialize', {
        method: 'POST',
        body: { order_id: order.data.id },
      });
      window.location.href = payment.data.authorization_url;
    } catch (err) {
      setError((err as Error).message);
      setBuying(false);
    }
  }

  if (loading || authLoading) return <Spinner />;
  if (!product) return <Alert>{error || 'Product not found.'}</Alert>;

  const maxQuantity = Math.min(product.stock, 100);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="card aspect-4/3 overflow-hidden bg-slate-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(product.price)}</p>
          <p className="mt-1 text-sm text-slate-500">{product.stock} in stock</p>
        </div>

        {product.description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{product.description}</p>
        )}

        {error && <Alert>{error}</Alert>}

        {product.stock === 0 ? (
          <Alert kind="info">This item is out of stock.</Alert>
        ) : (
          <div className="card space-y-4 p-4">
            <div>
              <label className="label" htmlFor="quantity">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Math.min(maxQuantity, Number(e.target.value) || 1)))
                }
                className="field w-28"
              />
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-lg font-semibold">{formatMoney(product.price * quantity)}</span>
            </div>
            <button onClick={handleBuy} disabled={buying} className="btn btn-primary w-full">
              {buying ? 'Redirecting to Paystack…' : 'Buy now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
