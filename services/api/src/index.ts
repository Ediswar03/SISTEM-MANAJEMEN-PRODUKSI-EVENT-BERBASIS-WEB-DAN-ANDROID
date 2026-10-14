import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';

const env = loadEnv();
const app = createApp(env);

const server = app.listen(env.API_PORT, () => {
  console.log(`EPMS API listening on port ${env.API_PORT} (${env.API_PREFIX})`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
