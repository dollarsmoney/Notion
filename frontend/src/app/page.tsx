'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { Alert, EmptyState, ProductGridSkeleton } from '@/components/ui';
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
  const [results, setResults] = useState<Results>({
    loading: true,
    products: [],
    total: 0,
    error: '',
  });

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (query) params.set('search', query);

    api<Paginated<Product>>(`/api/products?${params}`, { auth: false })
      .then((res) => {
        if (!cancelled)
          setResults({ loading: false, products: res.data, total: res.total, error: '' });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setResults((prev) => ({ ...prev, loading: true }));
    setPage(1);
    setQuery(search.trim());
  }

  function clearSearch() {
    setSearch('');
    setResults((prev) => ({ ...prev, loading: true }));
    setPage(1);
    setQuery('');
  }

  const { loading, products, total, error } = results;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything from independent vendors
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          Browse the catalogue and pay securely with Paystack. Your order is only confirmed once the
          payment has been verified.
        </p>

        <form onSubmit={handleSearch} className="mx-auto mt-6 flex max-w-md gap-2">
          <input
            className="field"
            placeholder="Search products…"
            aria-label="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${total} item${total === 1 ? '' : 's'}`}
          {query && !loading && (
            <>
              {' for '}
              <span className="font-medium text-slate-700">“{query}”</span>
            </>
          )}
        </p>
        {query && (
          <button onClick={clearSearch} className="btn btn-sm btn-ghost">
            Clear search
          </button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          title={query ? `No products match “${query}”` : 'No products yet'}
          description={
            query ? 'Try a different search term.' : 'Vendors have not listed anything yet.'
          }
          action={
            query ? (
              <button onClick={clearSearch} className="btn btn-secondary">
                Clear search
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page {page} of {lastPage}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= lastPage}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
