import type { NextFunction, Request, Response } from 'express';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  userQuerySchema,
} from './users.schemas.js';
import * as svc from './users.service.js';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getUsers(userQuerySchema.parse(req.query)));
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUserSchema.parse(req.body);
    res.status(201).json({ data: await svc.createUser(input, req.user!.id) });
  } catch (err) { next(err); }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await svc.getUserById(req.params['id']!) });
  } catch (err) { next(err); }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateUserSchema.parse(req.body);
    res.json({ data: await svc.updateUser(req.params['id']!, input, req.user!.id) });
  } catch (err) { next(err); }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const input = changePasswordSchema.parse(req.body);
    await svc.changePassword(req.user!.id, input);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getMySchedule(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await svc.getCrewSchedule(req.user!.id) });
  } catch (err) { next(err); }
}
