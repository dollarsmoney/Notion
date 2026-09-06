import type { OrderStatus, ProductStatus } from '@/lib/types';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-sm text-slate-500">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

/** Placeholder cards that match the real grid, so the layout does not jump. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-4/3 rounded-none" />
          <div className="space-y-2 p-4">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Alert({
  kind = 'error',
  children,
}: {
  kind?: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-slate-200 bg-white text-slate-600',
  }[kind];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
        ◦
      </div>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  fulfilled: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  draft: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  inactive: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  cancelled: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
};

export function StatusBadge({ status }: { status: OrderStatus | ProductStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        STATUS_STYLES[status] ?? STATUS_STYLES.draft
      }`}
    >
      {status}
    </span>
  );
}
