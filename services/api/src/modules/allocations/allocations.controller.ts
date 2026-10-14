import type { NextFunction, Request, Response } from 'express';
import { createAllocationSchema, updateAllocationSchema } from './allocations.schemas.js';
import * as svc from './allocations.service.js';

export async function listAllocations(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await svc.getEventAllocations(req.params['eventId']!) });
  } catch (err) { next(err); }
}

export async function createAllocation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createAllocationSchema.parse(req.body);
    const allocation = await svc.createAllocation(req.params['eventId']!, input, req.user!.id);
    res.status(201).json({ data: allocation });
  } catch (err) { next(err); }
}

export async function updateAllocation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateAllocationSchema.parse(req.body);
    const allocation = await svc.updateAllocation(
      req.params['eventId']!,
      req.params['allocationId']!,
      input,
      req.user!.id,
    );
    res.json({ data: allocation });
  } catch (err) { next(err); }
}

export async function cancelAllocation(req: Request, res: Response, next: NextFunction) {
  try {
    const allocation = await svc.cancelAllocation(
      req.params['eventId']!,
      req.params['allocationId']!,
      req.user!.id,
    );
    res.json({ data: allocation });
  } catch (err) { next(err); }
}
