import { z } from 'zod';

export const createAssignmentSchema = z
  .object({
    crewProfileId: z.string().uuid(),
    roleInEvent: z.string().min(1).max(128),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    notes: z.string().max(512).optional(),
  })
  .refine((d) => new Date(d.startAt) < new Date(d.endAt), {
    message: 'startAt must be strictly before endAt.',
    path: ['endAt'],
  });

export const updateAssignmentSchema = z.object({
  roleInEvent: z.string().min(1).max(128).optional(),
  jobStatus: z
    .enum(['ASSIGNED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'])
    .optional(),
  notes: z.string().max(512).nullable().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
