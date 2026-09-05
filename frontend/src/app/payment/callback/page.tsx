'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Alert, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { Order, PaymentStatus } from '@/lib/types';

interface VerifyResult {
  status: PaymentStatus;
  order: Order;
  message: string;
}

function CallbackResult() {
  const reference = useSearchParams().get('reference');
  const { session, loading: authLoading } = useAuth();

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (authLoading || !reference || !session) return;
    let cancelled = false;

    api<{ data: VerifyResult }>(`/api/payments/verify/${reference}`)
      .then((res) => !cancelled && setResult(res.data))
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setVerifying(false));

    return () => {
      cancelled = true;
    };
  }, [reference, session, authLoading]);

  if (authLoading) return <Spinner />;
  if (!reference) return <Alert>No payment reference was supplied.</Alert>;
  if (!session) return <Alert>Log in to confirm this payment.</Alert>;
  if (verifying) return <Spinner label="Verifying your payment…" />;

  const paid = result?.status === 'success';

  return (
    <div className="mx-auto max-w-md space-y-5 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {error ? 'Verification failed' : paid ? 'Payment confirmed' : 'Payment not completed'}
      </h1>

      {error ? <Alert>{error}</Alert> : <Alert kind={paid ? 'success' : 'info'}>{result?.message}</Alert>}

      {result && (
        <div className="card space-y-2 p-4 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Order</span>
            <span className="font-mono text-xs">{result.order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total</span>
            <span className="font-semibold">
              {formatMoney(result.order.total_amount, result.order.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span className="capitalize">{result.order.status}</span>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-2">
        <Link href="/orders" className="btn btn-primary">
          View orders
        </Link>
        <Link href="/" className="btn btn-secondary">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackResult />
    </Suspense>
  );
}
