import type { Request, Response } from 'express';
import { getHealth } from './health.service.js';

export async function healthController(_req: Request, res: Response): Promise<void> {
  const payload = await getHealth();
  res.status(payload.database.connected ? 200 : 503).json({ data: payload });
}
