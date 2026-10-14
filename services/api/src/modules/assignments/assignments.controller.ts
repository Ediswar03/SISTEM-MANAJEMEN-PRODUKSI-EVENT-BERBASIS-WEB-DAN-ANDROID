import type { NextFunction, Request, Response } from 'express';
import { createAssignmentSchema, updateAssignmentSchema } from './assignments.schemas.js';
import * as svc from './assignments.service.js';

export async function listAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await svc.getEventAssignments(req.params['eventId']!) });
  } catch (err) { next(err); }
}

export async function createAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createAssignmentSchema.parse(req.body);
    const assignment = await svc.createAssignment(req.params['eventId']!, input, req.user!.id);
    res.status(201).json({ data: assignment });
  } catch (err) { next(err); }
}

export async function updateAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateAssignmentSchema.parse(req.body);
    const assignment = await svc.updateAssignment(
      req.params['eventId']!,
      req.params['assignmentId']!,
      input,
      req.user!.id,
    );
    res.json({ data: assignment });
  } catch (err) { next(err); }
}

export async function cancelAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const assignment = await svc.cancelAssignment(
      req.params['eventId']!,
      req.params['assignmentId']!,
      req.user!.id,
    );
    res.json({ data: assignment });
  } catch (err) { next(err); }
}
