import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export const healthRouter = Router();

healthRouter.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Readiness fails if the database is unreachable, so k8s stops routing traffic.
healthRouter.get('/readyz', async (_req, res) => {
  const { error } = await supabaseAdmin.from('products').select('id').limit(1);
  if (error) {
    res.status(503).json({ status: 'unavailable', error: error.message });
    return;
  }
  res.json({ status: 'ready' });
});
