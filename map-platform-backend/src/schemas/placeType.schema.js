import { z } from 'zod';

export const createPlaceTypeZ = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().trim().optional(),
});

export const updatePlaceTypeZ = z
  .object({
    name: z.string().min(1).trim().optional(),
    description: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
    path: ['name'],
  });
