import type { NextFunction, Request, Response } from 'express';
import {
  createEventSchema,
  updateEventSchema,
  transitionStatusSchema,
  eventQuerySchema,
} from './events.schemas.js';
import * as eventsService from './events.service.js';

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const query = eventQuerySchema.parse(req.query);
    const result = await eventsService.getEvents(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createEventSchema.parse(req.body);
    const actorId = req.user!.id;
    const event = await eventsService.createEvent(input, actorId);
    res.status(201).json({ data: event });
  } catch (err) {
    next(err);
  }
}

export async function getEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await eventsService.getEventById(req.params['id']!);
    res.json({ data: event });
  } catch (err) {
    next(err);
  }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateEventSchema.parse(req.body);
    const actorId = req.user!.id;
    const event = await eventsService.updateEvent(req.params['id']!, input, actorId);
    res.json({ data: event });
  } catch (err) {
    next(err);
  }
}

export async function transitionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const input = transitionStatusSchema.parse(req.body);
    const actorId = req.user!.id;
    const event = await eventsService.transitionEventStatus(req.params['id']!, input, actorId);
    res.json({ data: event });
  } catch (err) {
    next(err);
  }
}

export async function cancelEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: string };
    const actorId = req.user!.id;
    const event = await eventsService.cancelEvent(req.params['id']!, reason, actorId);
    res.json({ data: event });
  } catch (err) {
    next(err);
  }
}
