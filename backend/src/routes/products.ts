import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, requireVendor } from '../middleware/auth';
import { AppError, param } from '../middleware/error';
import type { Product } from '../types';

export const productsRouter = Router();

const productInput = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  price: z.number().nonnegative(),
  image_url: z.string().url().optional().nullable(),
  stock: z.number().int().nonnegative(),
  status: z.enum(['draft', 'active', 'inactive']).default('draft'),
});

const listQuery = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

productsRouter.get('/', async (req, res) => {
  const { search, page, limit } = listQuery.parse(req.query);
  const from = (page - 1) * limit;

  let query = supabaseAdmin
    .from('products')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error, count } = await query.returns<Product[]>();
  if (error) throw new AppError(500, 'Could not load products', error.message);

  res.json({ data, page, limit, total: count ?? 0 });
});

// Declared before '/:id' so "mine" is not treated as an id.
productsRouter.get('/mine', requireAuth, requireVendor, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('vendor_id', req.profile!.id)
    .order('created_at', { ascending: false })
    .returns<Product[]>();

  if (error) throw new AppError(500, 'Could not load your products', error.message);
  res.json({ data });
});

productsRouter.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', param(req.params.id))
    .maybeSingle<Product>();

  if (error) throw new AppError(500, 'Could not load product', error.message);
  if (!data || data.status !== 'active') throw new AppError(404, 'Product not found');
  res.json({ data });
});

productsRouter.post('/', requireAuth, requireVendor, async (req, res) => {
  const input = productInput.parse(req.body);

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({ ...input, vendor_id: req.profile!.id })
    .select('*')
    .single<Product>();

  if (error) throw new AppError(500, 'Could not create product', error.message);
  res.status(201).json({ data });
});

productsRouter.patch('/:id', requireAuth, requireVendor, async (req, res) => {
  const input = productInput.partial().parse(req.body);

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(input)
    .eq('id', param(req.params.id))
    .eq('vendor_id', req.profile!.id)
    .select('*')
    .maybeSingle<Product>();

  if (error) throw new AppError(500, 'Could not update product', error.message);
  if (!data) throw new AppError(404, 'Product not found');
  res.json({ data });
});

productsRouter.delete('/:id', requireAuth, requireVendor, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', param(req.params.id))
    .eq('vendor_id', req.profile!.id)
    .select('id')
    .maybeSingle();

  if (error) throw new AppError(409, 'Could not delete product', error.message);
  if (!data) throw new AppError(404, 'Product not found');
  res.status(204).send();
});
