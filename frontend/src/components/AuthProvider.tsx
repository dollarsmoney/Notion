'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/lib/types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; fullName: string; role: UserRole }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (current: Session | null) => {
    if (!current) {
      setProfile(null);
      return;
    }
    const supabase = await getSupabase();
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', current.user.id)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    getSupabase()
      .then(async (supabase) => {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        await loadProfile(data.session);
        setLoading(false);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
          setSession(next);
          void loadProfile(next);
        });
        return () => sub.subscription.unsubscribe();
      })
      .catch(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      async signIn(email, password) {
        const supabase = await getSupabase();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      async signUp({ email, password, fullName, role }) {
        const supabase = await getSupabase();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
        });
        if (error) throw new Error(error.message);
        return { needsConfirmation: !data.session };
      },
      async signOut() {
        const supabase = await getSupabase();
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
