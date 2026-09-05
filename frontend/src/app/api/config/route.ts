import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Public config read at runtime rather than baked in at build time, so the same
 * image can be promoted through dev, demo and production unchanged.
 */
export function GET() {
  return NextResponse.json({
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  });
}
