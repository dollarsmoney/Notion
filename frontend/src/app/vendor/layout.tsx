'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Alert, Spinner } from '@/components/ui';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace('/login?next=/vendor/products');
  }, [loading, session, router]);

  if (loading || !session) return <Spinner />;
  if (profile?.role !== 'vendor') {
    return <Alert>This area is for vendor accounts only.</Alert>;
  }

  return <>{children}</>;
}
