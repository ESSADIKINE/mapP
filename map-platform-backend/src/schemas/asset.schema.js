import { z } from 'zod';

const assetTypeEnum = z.enum(['logo', 'panorama']);

export const listAssetsQueryZ = z.object({
  type: assetTypeEnum.optional(),
});

export const createAssetZ = z.object({
  type: assetTypeEnum,
  label: z.string().min(1, 'Label is required').trim(),
  url: z.string().url('A valid asset URL is required').trim(),
  publicId: z.string().min(1).optional(),
});

export const updateAssetZ = z
  .object({
    label: z.string().min(1).trim().optional(),
    url: z.string().url().trim().optional(),
    publicId: z.string().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
    path: ['label'],
  });
