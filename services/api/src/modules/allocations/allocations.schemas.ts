import { z } from 'zod';

export const createAllocationSchema = z
  .object({
    equipmentId: z.string().uuid(),
    quantity: z.number().int().min(1),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    notes: z.string().max(512).optional(),
  })
  .refine((d) => new Date(d.startAt) < new Date(d.endAt), {
    message: 'startAt must be strictly before endAt.',
    path: ['endAt'],
  });

export const updateAllocationSchema = z
  .object({
    quantity: z.number().int().min(1).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    notes: z.string().max(512).nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.startAt !== undefined && d.endAt !== undefined) return new Date(d.startAt) < new Date(d.endAt);
      return true;
    },
    { message: 'startAt must be strictly before endAt.', path: ['endAt'] },
  );

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;
