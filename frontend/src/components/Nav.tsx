'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      className={`btn btn-sm ${active ? 'bg-brand-50 text-brand-700' : 'btn-ghost'}`}
    >
      {children}
    </Link>
  );
}

export function Nav() {
  const { session, profile, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            M
          </span>
          <span className="hidden sm:inline">Marketplace</span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          {loading ? (
            <span className="skeleton h-8 w-32" />
          ) : session ? (
            <>
              {profile?.role === 'vendor' && <NavLink href="/vendor/products">My listings</NavLink>}
              <NavLink href="/orders">Orders</NavLink>
              <span className="mx-1 hidden text-sm text-slate-500 sm:inline">
                {profile?.full_name ?? session.user.email}
              </span>
              <button onClick={handleSignOut} className="btn btn-sm btn-secondary">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm btn-ghost">
                Log in
              </Link>
              <Link href="/register" className="btn btn-sm btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
