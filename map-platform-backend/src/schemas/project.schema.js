import { z } from 'zod';
import { principalPlaceZ, secondaryPlaceZ } from './place.schema.js';

export const createProjectZ = z.object({
  title: z.string().min(1),
  logoUrl: z.string().url().optional(),
  description: z.string().optional(),
  principal: principalPlaceZ,
  secondaries: z.array(secondaryPlaceZ).optional()
});

export const updateProjectZ = createProjectZ.partial();
