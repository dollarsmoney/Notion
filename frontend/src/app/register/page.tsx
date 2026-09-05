'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Alert } from '@/components/ui';
import type { UserRole } from '@/lib/types';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'user' as UserRole });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { needsConfirmation } = await signUp(form);
      if (needsConfirmation) {
        setNotice('Check your inbox to confirm your email address, then log in.');
        setBusy(false);
        return;
      }
      router.push(form.role === 'vendor' ? '/vendor/products' : '/');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}

        <div>
          <label className="label" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            required
            className="field"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="field"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>

        <fieldset>
          <legend className="label">I want to</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'user', title: 'Buy', hint: 'Browse and order' },
                { value: 'vendor', title: 'Sell', hint: 'List products' },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                  form.role === option.value
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={form.role === option.value}
                  onChange={() => update('role', option.value)}
                  className="sr-only"
                />
                <span className="block font-medium">{option.title}</span>
                <span className="text-xs text-slate-500">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
