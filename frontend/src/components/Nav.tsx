'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function Nav() {
  const { session, profile, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Marketplace
        </Link>

        <div className="ml-auto flex items-center gap-2 text-sm">
          {loading ? null : session ? (
            <>
              {profile?.role === 'vendor' && (
                <Link href="/vendor/products" className="btn btn-secondary">
                  My listings
                </Link>
              )}
              <Link href="/orders" className="btn btn-secondary">
                Orders
              </Link>
              <button onClick={handleSignOut} className="btn btn-secondary">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary">
                Log in
              </Link>
              <Link href="/register" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
