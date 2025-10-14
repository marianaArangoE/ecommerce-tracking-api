import { Schema } from 'mongoose';

export const ProductSchema = new Schema({
  sku:        { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  description:{ type: String },
  priceCents: { type: Number, required: true, min: 0 },
  currency:   { type: String, required: true }, // ISO-4217
  stock:      { type: Number, required: true, min: 0 },
  status:     { type: String, enum: ['draft','active','archived'], default: 'draft' },
  categoryId: { type: String },
  images:     { type: [String], default: [] },
  brand:      { type: String },
  tags:       { type: [String], default: [] },
  createdAt:  { type: String, required: true },
  updatedAt:  { type: String, required: true },
}, { versionKey: false });
