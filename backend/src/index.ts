import { createApp } from './app';
import { env } from './config/env';

const server = createApp().listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT} (${env.NODE_ENV})`);
});

// Let in-flight requests finish before k8s kills the pod.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
