import { supabaseAdmin } from '../lib/supabase';
import { AppError } from '../middleware/error';
import { env } from '../config/env';
import { toMinorUnits, verifyTransaction } from './paystack';
import type { Order, Payment, PaymentStatus, Product } from '../types';

export interface CartItem {
  product_id: string;
  quantity: number;
}

const ORDER_SELECT = '*, order_items(*)';

/**
 * Builds an order from the cart. Prices and availability always come from the
 * database — the client only supplies product ids and quantities.
 */
export async function createOrder(buyerId: string, items: CartItem[]): Promise<Order> {
  const ids = [...new Set(items.map((i) => i.product_id))];
  if (ids.length !== items.length) throw new AppError(400, 'Duplicate products in cart');

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, vendor_id, name, price, stock, status')
    .in('id', ids)
    .returns<Pick<Product, 'id' | 'vendor_id' | 'name' | 'price' | 'stock' | 'status'>[]>();

  if (error) throw new AppError(500, 'Could not load products', error.message);

  const byId = new Map(products.map((p) => [p.id, p]));
  const rows = items.map((item) => {
    const product = byId.get(item.product_id);
    if (!product) throw new AppError(404, `Product ${item.product_id} not found`);
    if (product.status !== 'active') throw new AppError(409, `"${product.name}" is not for sale`);
    if (product.stock < item.quantity) {
      throw new AppError(409, `"${product.name}" has only ${product.stock} left in stock`);
    }
    return {
      product_id: product.id,
      vendor_id: product.vendor_id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: Number(product.price),
    };
  });

  const total = rows.reduce((sum, r) => sum + r.unit_price * r.quantity, 0);

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({ buyer_id: buyerId, total_amount: total, currency: env.CURRENCY, status: 'pending' })
    .select('*')
    .single<Order>();

  if (orderError || !order) throw new AppError(500, 'Could not create order', orderError?.message);

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(rows.map((r) => ({ ...r, order_id: order.id })));

  if (itemsError) {
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    throw new AppError(500, 'Could not create order items', itemsError.message);
  }

  return getOrderForBuyer(order.id, buyerId);
}

export async function listOrdersForBuyer(buyerId: string): Promise<Order[]> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_SELECT)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
    .returns<Order[]>();

  if (error) throw new AppError(500, 'Could not load orders', error.message);
  return data;
}

export async function getOrderForBuyer(orderId: string, buyerId: string): Promise<Order> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .eq('buyer_id', buyerId)
    .maybeSingle<Order>();

  if (error) throw new AppError(500, 'Could not load order', error.message);
  if (!data) throw new AppError(404, 'Order not found');
  return data;
}

async function setPaymentStatus(
  reference: string,
  status: PaymentStatus,
  fields: Record<string, unknown> = {},
): Promise<void> {
  await supabaseAdmin.from('payments').update({ status, ...fields }).eq('reference', reference);
}

export interface FinalizeResult {
  status: PaymentStatus;
  order: Order;
  message: string;
}

/**
 * Single source of truth for marking an order paid. Called by both the checkout
 * callback and the Paystack webhook, so it must stay idempotent.
 */
export async function finalizePayment(reference: string): Promise<FinalizeResult> {
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .maybeSingle<Payment>();

  if (error) throw new AppError(500, 'Could not load payment', error.message);
  if (!payment) throw new AppError(404, 'Payment reference not found');

  const loadOrder = async (): Promise<Order> => {
    const { data } = await supabaseAdmin
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', payment.order_id)
      .single<Order>();
    return data as Order;
  };

  if (payment.status === 'success') {
    return { status: 'success', order: await loadOrder(), message: 'Payment already verified' };
  }

  const tx = await verifyTransaction(reference);

  if (tx.status !== 'success') {
    const status: PaymentStatus = tx.status === 'abandoned' ? 'abandoned' : 'failed';
    await setPaymentStatus(reference, status, {
      gateway_response: tx.gateway_response,
      raw_response: tx,
    });
    await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', payment.order_id).eq('status', 'pending');
    return { status, order: await loadOrder(), message: tx.gateway_response ?? 'Payment not successful' };
  }

  // Guard against a tampered or mismatched charge before crediting the order.
  const expected = toMinorUnits(Number(payment.amount));
  if (tx.amount !== expected || tx.currency !== payment.currency) {
    await setPaymentStatus(reference, 'failed', {
      gateway_response: 'Amount or currency mismatch',
      raw_response: tx,
    });
    throw new AppError(409, 'Paid amount does not match the order total');
  }

  await setPaymentStatus(reference, 'success', {
    gateway_response: tx.gateway_response,
    paid_at: tx.paid_at ?? new Date().toISOString(),
    raw_response: tx,
  });

  // Atomically flips pending -> paid and decrements stock; safe to call twice.
  const { error: rpcError } = await supabaseAdmin.rpc('mark_order_paid', {
    p_order_id: payment.order_id,
  });
  if (rpcError) throw new AppError(500, 'Could not finalize order', rpcError.message);

  return { status: 'success', order: await loadOrder(), message: 'Payment verified' };
}
