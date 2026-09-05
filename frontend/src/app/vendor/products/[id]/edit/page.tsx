'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/components/ProductForm';
import { Alert, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Read from the vendor's own list so drafts and inactive items resolve too.
  useEffect(() => {
    api<{ data: Product[] }>('/api/products/mine')
      .then((res) => {
        const found = res.data.find((p) => p.id === id);
        if (!found) throw new Error('Listing not found');
        setProduct(found);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!product) return <Alert>{error}</Alert>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
      <ProductForm product={product} />
    </div>
  );
}
