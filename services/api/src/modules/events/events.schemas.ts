import { z } from 'zod';

export const createEventSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens.'),
    name: z.string().min(1).max(255),
    clientName: z.string().max(255).optional(),
    location: z.string().min(1).max(512),
    timezone: z.string().max(64).default('Asia/Jakarta'),
    startAt: z.string().datetime({ message: 'startAt must be a valid ISO 8601 datetime string.' }),
    endAt: z.string().datetime({ message: 'endAt must be a valid ISO 8601 datetime string.' }),
    notes: z.string().max(5000).optional(),
    responsibleUserId: z.string().uuid().optional(),
  })
  .refine((data) => new Date(data.startAt) < new Date(data.endAt), {
    message: 'startAt must be strictly before endAt.',
    path: ['endAt'],
  });

export const updateEventSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    clientName: z.string().max(255).nullable().optional(),
    location: z.string().min(1).max(512).optional(),
    timezone: z.string().max(64).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    notes: z.string().max(5000).nullable().optional(),
    responsibleUserId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.startAt !== undefined && data.endAt !== undefined) {
        return new Date(data.startAt) < new Date(data.endAt);
      }
      return true;
    },
    { message: 'startAt must be strictly before endAt.', path: ['endAt'] },
  );

export const transitionStatusSchema = z.object({
  toStatus: z.enum(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  reason: z.string().max(512).optional(),
});

export const eventQuerySchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
