import { z } from 'zod';

// ─── Equipment Categories ─────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  code: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens.'),
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).nullable().optional(),
});

// ─── Equipment Items ──────────────────────────────────────────────────────────

export const createEquipmentSchema = z.object({
  categoryId: z.string().uuid(),
  code: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens.'),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  quantityOnHand: z.number().int().min(0),
  usableQuantity: z.number().int().min(0),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE']).default('GOOD'),
  storageLocation: z.string().min(1).max(255),
  notes: z.string().optional(),
});

export const updateEquipmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  quantityOnHand: z.number().int().min(0).optional(),
  usableQuantity: z.number().int().min(0).optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE']).optional(),
  storageLocation: z.string().min(1).max(255).optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  categoryId: z.string().uuid().optional(),
});

export const equipmentQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === 'false' ? false : v === 'true' ? true : undefined)),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const availabilityQuerySchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type EquipmentQueryInput = z.infer<typeof equipmentQuerySchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
