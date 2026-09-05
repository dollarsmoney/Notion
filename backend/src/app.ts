import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, env } from './config/env';
import { errorHandler, notFound } from './middleware/error';
import { healthRouter } from './routes/health';
import { ordersRouter } from './routes/orders';
import { paymentsRouter } from './routes/payments';
import { productsRouter } from './routes/products';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  if (env.NODE_ENV !== 'test') app.use(morgan('combined'));

  // Keep the raw body so the Paystack webhook signature can be verified.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );

  app.use(healthRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/payments', paymentsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
