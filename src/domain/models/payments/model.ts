import { model, Types } from 'mongoose';
import { PaymentMethodSchema, PaymentIntentSchema } from './schema';

export interface PaymentMethod {
  _id: Types.ObjectId;
  userId: string;
  type: 'credit_card'|'debit_card'|'paypal'|'transfer'|'cash_on_delivery';
  provider?: string;
  last4?: string;
  token?: string;
  tokenized?: boolean;
  isDefault?: boolean;
  createdAt: string;
}

export interface PaymentIntent {
  _id: Types.ObjectId;
  userId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  method: 'card'|'transfer'|'cod';
  provider?: string;
  paymentMethodId?: string;
  status: 'requires_confirmation'|'pending'|'succeeded'|'failed';
  clientSecret?: string;
  ref?: string;
  createdAt: string;
  updatedAt: string;
}

PaymentMethodSchema.virtual('id').get(function (this: any) {
  return this._id?.toString?.() ?? this._id;
});
PaymentIntentSchema.virtual('id').get(function (this: any) {
  return this._id?.toString?.() ?? this._id;
});
PaymentMethodSchema.set('toJSON', { virtuals: true });
PaymentIntentSchema.set('toJSON', { virtuals: true });
PaymentMethodSchema.set('toObject', { virtuals: true });
PaymentIntentSchema.set('toObject', { virtuals: true });

export const PaymentMethodModel = model<PaymentMethod>('PaymentMethod', PaymentMethodSchema);
export const PaymentIntentModel = model<PaymentIntent>('PaymentIntent', PaymentIntentSchema);
