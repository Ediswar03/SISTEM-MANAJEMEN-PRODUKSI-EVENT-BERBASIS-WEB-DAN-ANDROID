import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(255),
  role: z.enum(['ADMIN', 'CREW']),
  // Crew-profile fields (only used when role === 'CREW')
  phone: z.string().max(32).optional(),
  skills: z.string().max(512).optional(),
  notes: z.string().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  // Crew-profile fields
  phone: z.string().max(32).nullable().optional(),
  skills: z.string().max(512).optional(),
  notes: z.string().nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const userQuerySchema = z.object({
  role: z.enum(['ADMIN', 'CREW']).optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === 'false' ? false : v === 'true' ? true : undefined)),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
