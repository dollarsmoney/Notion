import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const low = product.stock > 0 && product.stock <= 5;

  return (
    <Link href={`/products/${product.id}`} className="card-interactive group flex flex-col overflow-hidden">
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        {product.image_url ? (
          // Remote images come from Supabase Storage; a plain img keeps the runtime simple.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No image
          </div>
        )}
        {low && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
            Only {product.stock} left
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-medium text-slate-900 group-hover:text-brand-700">
          {product.name}
        </h3>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</p>
        )}
        <p className="mt-3 text-lg font-semibold tracking-tight">{formatMoney(product.price)}</p>
      </div>
    </Link>
  );
}
