import { z } from 'zod';

const basePlaceSchema = z.object({
  name: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  virtualtour: z.string().url().optional(),
  tourUrl: z.string().url().optional(),
  zoom: z.number().optional(),
  bounds: z.array(z.array(z.number())).length(2).optional(),
  heading: z.number().optional(),
  category: z.enum(['Principal', 'Secondary', 'Other']).optional(),
  routesFromBase: z.array(z.string()).optional(),
  model3d: z
    .object({
      url: z.string().url(),
      useAsMarker: z.boolean().optional(),
      scale: z.number().optional(),
      rotation: z.array(z.number()).length(3).optional(),
      altitude: z.number().optional()
    })
    .optional(),
  footerInfo: z
    .object({
      location: z.string().optional(),
      distance: z.string().optional(),
      time: z.string().optional()
    })
    .optional()
  }).refine(
    (p) => {
      const hasPano = !!p.virtualtour;
      const hasTour = !!p.tourUrl;
      return (hasPano || hasTour) && !(hasPano && hasTour);
    },
    {
      message: 'Each place requires exactly one media: 360 image or tour URL',
      path: ['virtualtour']
    }
  );

// Create extended schemas first
const principalPlaceSchema = basePlaceSchema.extend({
  category: z.literal('Principal').optional()
});

const secondaryPlaceSchema = basePlaceSchema.extend({
  category: z.literal('Secondary').optional()
});

// Create partial versions for updates
const basePlacePartialSchema = basePlaceSchema.partial();
const principalPlacePartialSchema = principalPlaceSchema.partial();
const secondaryPlacePartialSchema = secondaryPlaceSchema.partial();

// Validation function for media requirements
const validateMedia = (p) => {
  const hasPano = !!p.virtualtour;
  const hasTour = !!p.tourUrl;
  return (hasPano || hasTour) && !(hasPano && hasTour);
};

// Apply refine validation to the base schema
export const basePlaceZ = basePlaceSchema.refine(validateMedia, {
  message: 'Each place requires exactly one media: 360 image or tour URL',
  path: ['virtualtour']
});

// Apply the same refine validation to extended schemas
export const principalPlaceZ = principalPlaceSchema.refine(validateMedia, {
  message: 'Each place requires exactly one media: 360 image or tour URL',
  path: ['virtualtour']
});

export const secondaryPlaceZ = secondaryPlaceSchema.refine(validateMedia, {
  message: 'Each place requires exactly one media: 360 image or tour URL',
  path: ['virtualtour']
});

// Export partial schemas for updates (without refine validation since updates might be partial)
export const basePlacePartialZ = basePlacePartialSchema;
export const principalPlacePartialZ = principalPlacePartialSchema;
export const secondaryPlacePartialZ = secondaryPlacePartialSchema;
