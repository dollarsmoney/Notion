import { getConfig } from './config';
import { getSupabase } from './supabase';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const { apiUrl } = await getConfig();
  const headers: Record<string, string> = {};

  if (auth) {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, (payload as { error?: string })?.error ?? `Request failed (${res.status})`);
  }
  return payload as T;
}
