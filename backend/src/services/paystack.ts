import crypto from 'node:crypto';
import { env } from '../config/env';
import { AppError } from '../middleware/error';

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface InitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface VerifyData {
  id: number;
  status: string; // 'success' | 'failed' | 'abandoned' | ...
  reference: string;
  amount: number; // minor units (kobo)
  currency: string;
  gateway_response: string | null;
  paid_at: string | null;
  metadata: Record<string, unknown> | null;
}

async function paystackRequest<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.PAYSTACK_BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
    });
  } catch {
    throw new AppError(502, 'Could not reach Paystack');
  }

  const payload = (await response.json().catch(() => null)) as PaystackResponse<T> | null;

  if (!response.ok || !payload?.status) {
    throw new AppError(502, payload?.message ?? `Paystack request failed (${response.status})`);
  }

  return payload.data;
}

export function initializeTransaction(params: {
  email: string;
  amountMinor: number;
  reference: string;
  currency: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<InitializeData> {
  return paystackRequest<InitializeData>('/transaction/initialize', {
    method: 'POST',
    body: {
      email: params.email,
      amount: params.amountMinor,
      reference: params.reference,
      currency: params.currency,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    },
  });
}

export function verifyTransaction(reference: string): Promise<VerifyData> {
  return paystackRequest<VerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
  });
}

export function isValidWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const toMinorUnits = (amount: number): number => Math.round(amount * 100);
