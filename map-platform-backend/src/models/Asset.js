import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['logo', 'panorama'],
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

assetSchema.index({ type: 1, label: 1 }, { unique: true });
assetSchema.index({ type: 1, url: 1 }, { unique: true });

export const Asset = mongoose.model('Asset', assetSchema);
