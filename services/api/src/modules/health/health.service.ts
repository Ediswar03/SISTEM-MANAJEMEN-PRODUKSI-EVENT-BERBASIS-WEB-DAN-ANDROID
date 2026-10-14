import { prisma } from '../../lib/prisma.js';

export type HealthStatus = {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  database: {
    connected: boolean;
    engine: string | null;
    version: string | null;
  };
};

export async function getHealth(): Promise<HealthStatus> {
  let connected = false;
  let engine: string | null = null;
  let version: string | null = null;

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ engine: string; version: string }>>(
      'SELECT @@default_storage_engine AS engine, VERSION() AS version',
    );
    const row = rows[0];
    connected = Boolean(row);
    engine = row?.engine ?? null;
    version = row?.version ?? null;
  } catch (error) {
    console.error('[health] database ping failed', error instanceof Error ? error.message : 'unknown');
  }

  return {
    status: connected ? 'ok' : 'degraded',
    service: 'epms-api',
    timestamp: new Date().toISOString(),
    database: { connected, engine, version },
  };
}
