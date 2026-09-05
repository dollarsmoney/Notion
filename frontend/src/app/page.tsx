'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Alert, Spinner } from '@/components/ui';
import type { Paginated, Product } from '@/lib/types';

const PAGE_SIZE = 12;

interface Results {
  loading: boolean;
  products: Product[];
  total: number;
  error: string;
}

export default function BrowsePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results>({ loading: true, products: [], total: 0, error: '' });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (query) params.set('search', query);

    api<Paginated<Product>>(`/api/products?${params}`, { auth: false })
      .then((res) => {
        if (!cancelled) setResults({ loading: false, products: res.data, total: res.total, error: '' });
      })
      .catch((err: Error) => {
        if (!cancelled) setResults((prev) => ({ ...prev, loading: false, error: err.message }));
      });

    return () => {
      cancelled = true;
    };
  }, [page, query]);

  function goToPage(next: number) {
    setResults((prev) => ({ ...prev, loading: true }));
    setPage(next);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setResults((prev) => ({ ...prev, loading: true }));
    setPage(1);
    setQuery(search.trim());
  }

  const { loading, products, total, error } = results;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Browse products</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} item{total === 1 ? '' : 's'} available
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            className="field w-56"
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
      </div>

      {error && <Alert>{error}</Alert>}
      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Alert kind="info">No products found.</Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button className="btn btn-secondary" disabled={page === 1} onClick={() => goToPage(page - 1)}>
            Previous
          </button>
          <span className="text-slate-500">
            Page {page} of {lastPage}
          </span>
          <button className="btn btn-secondary" disabled={page >= lastPage} onClick={() => goToPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
