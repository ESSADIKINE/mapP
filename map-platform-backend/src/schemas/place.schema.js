import { z } from 'zod';

const basePlaceObject = z.object({
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
      altitude: z.number().optional(),
    })
    .optional(),
  footerInfo: z
    .object({
      location: z.string().optional(),
      distance: z.string().optional(),
      time: z.string().optional(),
    })
    .optional(),
});

const mediaRefinement = {
  message: 'Each place requires exactly one media: 360 image or tour URL',
  path: ['virtualtour'],
};

const mediaCheck = (p) => {
  const hasPano = !!p.virtualtour;
  const hasTour = !!p.tourUrl;
  return (hasPano || hasTour) && !(hasPano && hasTour);
};

export const basePlaceZ = basePlaceObject.refine(mediaCheck, mediaRefinement);

export const principalPlaceZ = basePlaceObject
  .extend({ category: z.literal('Principal').optional() })
  .refine(mediaCheck, mediaRefinement);

export const secondaryPlaceZ = basePlaceObject
  .extend({ category: z.literal('Secondary').optional() })
  .refine(mediaCheck, mediaRefinement);

// Partial schemas useful for updates where fields are optional
export const principalPlacePartialZ = principalPlaceZ.partial();
export const secondaryPlacePartialZ = secondaryPlaceZ.partial();
