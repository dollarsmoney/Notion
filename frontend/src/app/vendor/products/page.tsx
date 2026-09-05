'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, EmptyState, Spinner, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { Product } from '@/lib/types';

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ data: Product[] }>('/api/products/mine')
      .then((res) => setProducts(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api(`/api/products/${product.id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <Spinner />;

  const active = products.filter((p) => p.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
          <p className="mt-1 text-sm text-slate-500">
            {products.length} total, {active} active
          </p>
        </div>
        <Link href="/vendor/products/new" className="btn btn-primary">
          New listing
        </Link>
      </div>

      {error && <Alert>{error}</Alert>}

      {products.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Create your first product to start selling."
          action={
            <Link href="/vendor/products/new" className="btn btn-primary">
              New listing
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {product.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="font-medium text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">{formatMoney(product.price)}</td>
                  <td className="px-5 py-3">
                    <span className={product.stock === 0 ? 'text-red-600' : ''}>{product.stock}</span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/vendor/products/${product.id}/edit`}
                        className="btn btn-sm btn-secondary"
                      >
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(product)} className="btn btn-sm btn-danger">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
