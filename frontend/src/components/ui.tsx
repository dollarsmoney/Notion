import type { OrderStatus, ProductStatus } from '@/lib/types';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-12 text-center text-sm text-slate-500">{label}</p>;
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-slate-200 bg-slate-50 text-slate-600',
  }[kind];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-100 text-emerald-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  draft: 'bg-slate-100 text-slate-600',
  inactive: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-600',
  failed: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: OrderStatus | ProductStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  );
}
