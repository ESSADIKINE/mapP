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
    zoom: { type: Number, default: 15 },
    bounds: { type: [[Number]], default: undefined }, // [[lng,lat],[lng,lat]]
    heading: { type: Number, default: 0 },
    category: { type: String, enum: ['Principal', 'Secondary', 'Other'], default: 'Other' },
    routesFromBase: { type: [String], default: [] }, // encoded polylines (secondary)
    footerInfo: { type: FooterInfoSchema, default: {} }
  },
  { _id: true, timestamps: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    logoUrl: { type: String },
    description: { type: String },
    principal: { type: PlaceSchema, required: true },
    secondaries: { type: [PlaceSchema], default: [] }
  },
  { timestamps: true }
);

export const Project = mongoose.model('Project', ProjectSchema);
