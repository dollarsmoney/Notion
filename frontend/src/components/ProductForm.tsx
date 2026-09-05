'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Alert } from './ui';
import { api } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import type { Product, ProductStatus } from '@/lib/types';

const BUCKET = 'product-images';

interface Props {
  product?: Product;
}

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const { session } = useAuth();

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    stock: product ? String(product.stock) : '0',
    status: (product?.status ?? 'draft') as ProductStatus,
    image_url: product?.image_url ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(file: File) {
    if (!session) return;
    setUploading(true);
    setError('');
    try {
      const supabase = await getSupabase();
      // Path is prefixed with the vendor id; the storage policy enforces the match.
      const path = `${session.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      update('image_url', data.publicUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      stock: Number(form.stock),
      status: form.status,
      image_url: form.image_url || null,
    };

    try {
      if (product) {
        await api(`/api/products/${product.id}`, { method: 'PATCH', body });
      } else {
        await api('/api/products', { method: 'POST', body });
      }
      router.push('/vendor/products');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4 p-5">
      {error && <Alert>{error}</Alert>}

      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          required
          maxLength={200}
          className="field"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          className="field"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="price">
            Price
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            required
            className="field"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="stock">
            Stock
          </label>
          <input
            id="stock"
            type="number"
            min="0"
            step="1"
            required
            className="field"
            value={form.stock}
            onChange={(e) => update('stock', e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className="field"
            value={form.status}
            onChange={(e) => update('status', e.target.value as ProductStatus)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="image">
          Image
        </label>
        <div className="flex items-start gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {form.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">None</div>
            )}
          </div>
          <div className="space-y-2">
            <input
              id="image"
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <p className="text-xs text-slate-500">
              {uploading ? 'Uploading…' : 'JPEG, PNG, WebP or GIF up to 5 MB.'}
            </p>
            {form.image_url && (
              <button type="button" onClick={() => update('image_url', '')} className="btn btn-secondary">
                Remove image
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button type="submit" disabled={busy || uploading} className="btn btn-primary">
          {busy ? 'Saving…' : product ? 'Save changes' : 'Create listing'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
