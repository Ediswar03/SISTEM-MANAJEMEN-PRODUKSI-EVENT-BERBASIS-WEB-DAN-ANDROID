import type { NextFunction, Request, Response } from 'express';
import {
  createCategorySchema,
  updateCategorySchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentQuerySchema,
  availabilityQuerySchema,
} from './equipment.schemas.js';
import * as svc from './equipment.service.js';

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await svc.getCategories() });
  } catch (err) { next(err); }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCategorySchema.parse(req.body);
    res.status(201).json({ data: await svc.createCategory(input) });
  } catch (err) { next(err); }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCategorySchema.parse(req.body);
    res.json({ data: await svc.updateCategory(req.params['id']!, input) });
  } catch (err) { next(err); }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteCategory(req.params['id']!);
    res.status(204).send();
  } catch (err) { next(err); }
}

// ── Equipment Items ───────────────────────────────────────────────────────────

export async function listEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const query = equipmentQuerySchema.parse(req.query);
    res.json(await svc.getEquipment(query));
  } catch (err) { next(err); }
}

export async function createEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createEquipmentSchema.parse(req.body);
    res.status(201).json({ data: await svc.createEquipment(input, req.user!.id) });
  } catch (err) { next(err); }
}

export async function getEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await svc.getEquipmentById(req.params['id']!) });
  } catch (err) { next(err); }
}

export async function updateEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateEquipmentSchema.parse(req.body);
    res.json({ data: await svc.updateEquipment(req.params['id']!, input, req.user!.id) });
  } catch (err) { next(err); }
}

export async function getAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const query = availabilityQuerySchema.parse(req.query);
    res.json({ data: await svc.getEquipmentAvailability(req.params['id']!, query) });
  } catch (err) { next(err); }
}
