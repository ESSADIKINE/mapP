import { z } from 'zod';

export const basePlaceZ = z.object({
  name: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  virtualtour: z.string().url().optional(),
  zoom: z.number().optional(),
  bounds: z.array(z.array(z.number())).length(2).optional(),
  heading: z.number().optional(),
  category: z.enum(['Principal', 'Secondary', 'Other']).optional(),
  routesFromBase: z.array(z.string()).optional(),
  footerInfo: z
    .object({
      location: z.string().optional(),
      distance: z.string().optional(),
      time: z.string().optional()
    })
    .optional()
});

export const principalPlaceZ = basePlaceZ.extend({
  category: z.literal('Principal').optional()
});

export const secondaryPlaceZ = basePlaceZ.extend({
  category: z.literal('Secondary').optional()
});
