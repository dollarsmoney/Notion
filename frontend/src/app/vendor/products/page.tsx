'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Spinner, StatusBadge } from '@/components/ui';
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
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await api(`/api/products/${product.id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
        <Link href="/vendor/products/new" className="btn btn-primary">
          New listing
        </Link>
      </div>

      {error && <Alert>{error}</Alert>}

      {products.length === 0 ? (
        <Alert kind="info">You have no listings yet.</Alert>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">{formatMoney(product.price)}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/vendor/products/${product.id}/edit`} className="btn btn-secondary">
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(product)} className="btn btn-danger">
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
