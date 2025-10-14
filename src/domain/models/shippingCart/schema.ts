import { Schema } from 'mongoose';

export const CartItemSchema = new Schema({
  productId: { type: String, required: true },
  sku:        { type: String, required: true },
  name:       { type: String, required: true },
  image:      { type: String },
  quantity:   { type: Number, required: true, min: 1, max: 999 },
  unitPriceCents: { type: Number, required: true, min: 0 },
  totalCents:     { type: Number, required: true, min: 0 },
}, { _id: false });

export const CartSchema = new Schema({
  userId:       { type: String, required: true, index: true },
  currency:     { type: String, required: true },
  items:        { type: [CartItemSchema], default: [] },
  subtotalCents:{ type: Number, required: true, default: 0 },
  createdAt:    { type: String, required: true, default: () => new Date().toISOString() },
  updatedAt:    { type: String, required: true, default: () => new Date().toISOString() },
}, { versionKey: false });
