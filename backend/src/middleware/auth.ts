import type { RequestHandler } from 'express';
import { supabaseAdmin, supabaseAuth } from '../lib/supabase';
import { AppError } from './error';
import type { Profile, UserRole } from '../types';

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req.headers.authorization);
  if (!token) throw new AppError(401, 'Missing bearer token');

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) throw new AppError(401, 'Invalid or expired token');

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single<Profile>();

  if (profileError || !profile) throw new AppError(403, 'Profile not found for this account');

  req.user = { id: data.user.id, email: data.user.email ?? profile.email };
  req.profile = profile;
  next();
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.profile) throw new AppError(401, 'Not authenticated');
    if (!roles.includes(req.profile.role)) {
      throw new AppError(403, `Requires role: ${roles.join(' or ')}`);
    }
    next();
  };
}

export const requireVendor = requireRole('vendor');
