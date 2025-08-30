import mongoose from 'mongoose';

const FooterInfoSchema = new mongoose.Schema(
  {
    location: { type: String },
    distance: { type: String }, // secondary-only
    time: { type: String }      // secondary-only
  },
  { _id: false }
);

const PlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    virtualtour: { type: String }, // Cloudinary URL
    tourUrl: { type: String },
    zoom: { type: Number, default: 15 },
    bounds: { type: [[Number]], default: undefined }, // [[lng,lat],[lng,lat]]
    heading: { type: Number, default: 0 },
    category: { type: String, enum: ['Principal', 'Secondary', 'Other'], default: 'Other' },
    routesFromBase: { type: [String], default: [] }, // encoded polylines (secondary)
    footerInfo: { type: FooterInfoSchema, default: {} },
    model3d: {
      url: { type: String },
      useAsMarker: { type: Boolean, default: false },
      scale: { type: Number, default: 1 },
      rotation: { type: [Number], default: [0, 0, 0] },
      altitude: { type: Number, default: 0 }
    }
  },
  { _id: true, timestamps: false }
);

PlaceSchema.pre('validate', function(next) {
  const hasPano = !!this.virtualtour;
  const hasTour = !!this.tourUrl;
  if ((hasPano || hasTour) && !(hasPano && hasTour)) return next();
  next(new Error('Each place requires exactly one media: 360 image or tour URL'));
});

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    logoUrl: { type: String },
    description: { type: String },
    styleURL: { type: String },
    principal: { type: PlaceSchema, required: true },
    secondaries: { type: [PlaceSchema], default: [] }
  },
  { timestamps: true }
);

export const Project = mongoose.model('Project', ProjectSchema);
