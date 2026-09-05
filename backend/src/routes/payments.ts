import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { AppError, param } from '../middleware/error';
import { finalizePayment, getOrderForBuyer } from '../services/orders';
import { initializeTransaction, isValidWebhookSignature, toMinorUnits } from '../services/paystack';
import type { Payment } from '../types';

export const paymentsRouter = Router();

const initializeInput = z.object({ order_id: z.string().uuid() });

paymentsRouter.post('/initialize', requireAuth, async (req, res) => {
  const { order_id } = initializeInput.parse(req.body);
  const order = await getOrderForBuyer(order_id, req.profile!.id);

  if (order.status !== 'pending') {
    throw new AppError(409, `Order is already ${order.status}`);
  }

  const reference = `mkt_${order.id.replace(/-/g, '').slice(0, 12)}_${crypto.randomBytes(6).toString('hex')}`;

  const paystack = await initializeTransaction({
    email: req.user!.email,
    amountMinor: toMinorUnits(Number(order.total_amount)),
    reference,
    currency: order.currency,
    callbackUrl: `${env.FRONTEND_URL}/payment/callback`,
    metadata: { order_id: order.id, buyer_id: req.profile!.id },
  });

  const { error } = await supabaseAdmin.from('payments').insert({
    order_id: order.id,
    reference,
    provider: 'paystack',
    amount: order.total_amount,
    currency: order.currency,
    status: 'pending',
    authorization_url: paystack.authorization_url,
  });

  if (error) throw new AppError(500, 'Could not record payment', error.message);

  res.status(201).json({
    data: { reference, authorization_url: paystack.authorization_url, order_id: order.id },
  });
});

paymentsRouter.get('/verify/:reference', requireAuth, async (req, res) => {
  const reference = param(req.params.reference);

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('order_id')
    .eq('reference', reference)
    .maybeSingle<Pick<Payment, 'order_id'>>();

  if (!payment) throw new AppError(404, 'Payment reference not found');
  // Throws 404 if the reference belongs to someone else's order.
  await getOrderForBuyer(payment.order_id, req.profile!.id);

  res.json({ data: await finalizePayment(reference) });
});

// Paystack posts here. Signature is checked against the raw body.
paymentsRouter.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!isValidWebhookSignature(req.rawBody ?? Buffer.alloc(0), signature as string | undefined)) {
    throw new AppError(401, 'Invalid signature');
  }

  const event = req.body as { event?: string; data?: { reference?: string } };
  if (event.event === 'charge.success' && event.data?.reference) {
    await finalizePayment(event.data.reference).catch((err) =>
      console.error('Webhook finalize failed:', event.data?.reference, err),
    );
  }

  res.sendStatus(200);
});
