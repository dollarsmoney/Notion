import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { param } from '../middleware/error';
import { createOrder, getOrderForBuyer, listOrdersForBuyer } from '../services/orders';

export const ordersRouter = Router();

const createOrderInput = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1),
});

ordersRouter.use(requireAuth);

ordersRouter.post('/', async (req, res) => {
  const { items } = createOrderInput.parse(req.body);
  const order = await createOrder(req.profile!.id, items);
  res.status(201).json({ data: order });
});

ordersRouter.get('/', async (req, res) => {
  res.json({ data: await listOrdersForBuyer(req.profile!.id) });
});

ordersRouter.get('/:id', async (req, res) => {
  res.json({ data: await getOrderForBuyer(param(req.params.id), req.profile!.id) });
});
