import { Schema } from 'mongoose';

export const CheckoutItemSchema = new Schema({
  productId: String, sku: String, name: String, image: String,
  quantity: { type: Number, min: 1, max: 999, required: true },
  unitPriceCents: { type: Number, min: 0, required: true },
  totalCents: { type: Number, min: 0, required: true },
}, { _id: false });

export const AddressSnapshotSchema = new Schema({
  id: String,
  city: String,
  postalCode: String,
  address: String,
}, { _id: false });

export const CheckoutSchema = new Schema({
  userId: { type: String, index: true, required: true },
  currency: { type: String, required: true },
  items: { type: [CheckoutItemSchema], required: true },
  subtotalCents: { type: Number, min: 0, required: true },

  addressId: { type: String, required: true },            
  addressSnapshot: { type: AddressSnapshotSchema, required: true }, 
  shippingMethod: { type: String, enum: ['standard','express'], required: true },
  shippingCents: { type: Number, min: 0, required: true },
  paymentMethod: { type: String, enum: ['card','transfer','cod'], required: true },

  grandTotalCents: { type: Number, min: 0, required: true },
  status: { type: String, enum: ['pending','confirmed','cancelled','expired'], default: 'pending' },
  createdAt: { type: String, default: () => new Date().toISOString(), required: true },
  updatedAt: { type: String, default: () => new Date().toISOString(), required: true },
}, { versionKey: false });
