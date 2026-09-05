import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="card overflow-hidden transition hover:shadow-md">
      <div className="aspect-4/3 bg-slate-100">
        {product.image_url ? (
          // Remote images come from Supabase Storage; plain img keeps the runtime simple.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-medium">{product.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{product.stock} in stock</p>
        <p className="mt-2 font-semibold">{formatMoney(product.price)}</p>
      </div>
    </Link>
  );
}
