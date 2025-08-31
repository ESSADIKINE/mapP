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
  // 3D model fields
  modelUrl: z.string().optional(), // URL to the 3D model file
  modelPosition: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    z: z.number().optional()
  }).optional(),
  model3d: z
    .object({
      // Accept absolute URLs or relative paths like "./uploads/model.glb"
      url: z.string().min(1).optional(),
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
  // Allow places without media for now (they can be added later)
  return !(hasPano && hasTour); // Only prevent having both
};

// Create extended schemas first
const principalPlaceObject = basePlaceObject.extend({ 
  category: z.literal('Principal').optional() 
});

const secondaryPlaceObject = basePlaceObject.extend({ 
  category: z.literal('Secondary').optional() 
});

// Create partial versions before applying refine
const basePlacePartialObject = basePlaceObject.partial();
const principalPlacePartialObject = principalPlaceObject.partial();
const secondaryPlacePartialObject = secondaryPlaceObject.partial();

// Apply refine validation to the base schemas
export const basePlaceZ = basePlaceObject.refine(mediaCheck, mediaRefinement);

export const principalPlaceZ = principalPlaceObject.refine(mediaCheck, mediaRefinement);

export const secondaryPlaceZ = secondaryPlaceObject.refine(mediaCheck, mediaRefinement);

// Export partial schemas (without refine validation since updates might be partial)
export const basePlacePartialZ = basePlacePartialObject;
export const principalPlacePartialZ = principalPlacePartialObject;
export const secondaryPlacePartialZ = secondaryPlacePartialObject;
