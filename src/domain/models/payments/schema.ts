import { Schema } from 'mongoose';

/* ===== PaymentMethod ===== */
export const PaymentMethodSchema = new Schema({
  userId:     { type: String, index: true, required: true },
  type:       { type: String, enum: ['credit_card','debit_card','paypal','transfer','cash_on_delivery'], required: true },
  provider:   { type: String },
  last4:      { type: String },
  token:      { type: String },    // mock tokenizado
  tokenized:  { type: Boolean, default: false },
  isDefault:  { type: Boolean, default: false },
  createdAt:  { type: String, required: true },
}, { versionKey: false });

/* ===== PaymentIntent ===== */
export const PaymentIntentSchema = new Schema({
  userId:          { type: String, index: true, required: true },
  orderId:         { type: String, index: true, required: true },
  amountCents:     { type: Number, min: 0, required: true },
  currency:        { type: String, required: true },

  method:          { type: String, enum: ['card','transfer','cod'], required: true },
  provider:        { type: String },
  paymentMethodId: { type: String }, // si viene de un método guardado

  status:          { type: String, enum: ['requires_confirmation','pending','succeeded','failed'], required: true },

  // Campos específicos por método
  clientSecret:    { type: String }, // card
  ref:             { type: String }, // transfer

  createdAt:       { type: String, required: true },
  updatedAt:       { type: String, required: true },
}, { versionKey: false });

// 1 intent por orden/usuario (idempotencia)
PaymentIntentSchema.index({ orderId: 1, userId: 1 }, { unique: true });
