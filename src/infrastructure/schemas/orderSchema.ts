import { Schema } from 'mongoose';

export const OrderItemSchema = new Schema({
  productId:      { type: String, required: true },
  name:           { type: String, required: true },
  sku:            { type: String, required: true },
  quantity:       { type: Number, required: true, min: 1, max: 999 },
  unitPriceCents: { type: Number, required: true, min: 0 },
  totalCents:     { type: Number, required: true, min: 0 },
}, { _id: false });

export const OrderSchema = new Schema({
  userId:     { type: String, required: true, index: true },
  orderId:    { type: String, required: true, unique: true },     // ORD-YYYYMMDD-XXXXX
  checkoutId: { type: String, required: true, unique: true },     // impedir doble confirmación del mismo checkout

  items:      { type: [OrderItemSchema], required: true },
  currency:   { type: String, required: true },
  totalCents: { type: Number, required: true, min: 0 },

  status:     { type: String, enum: ['PENDIENTE','PROCESANDO','COMPLETADA','CANCELADA'], default: 'PENDIENTE' },
  paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },

  createdAt:  { type: String, default: () => new Date().toISOString(), required: true },
  updatedAt:  { type: String, default: () => new Date().toISOString(), required: true },
}, { versionKey: false });
