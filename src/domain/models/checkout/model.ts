
import { model, Types } from 'mongoose';
import { CheckoutSchema } from './schema';

export type ShippingMethod = 'standard'|'express';
export type PaymentMethod  = 'card'|'transfer'|'cod';
export type CheckoutStatus = 'pending'|'confirmed'|'cancelled'|'expired';

export interface AddressSnapshot { id: string; city: string; postalCode: string; address: string; }
export interface CheckoutItem {
  productId: string; sku: string; name: string; image?: string;
  quantity: number; unitPriceCents: number; totalCents: number;
}
export interface Checkout {
  id: string; 
  cartId: string; 
  userId: string; 
  currency: string;
  items: CheckoutItem[];
  subtotalCents: number;
  addressId: string; 
  addressSnapshot: AddressSnapshot;
  shippingMethod: ShippingMethod; 
  shippingCents: number;
  paymentMethod: PaymentMethod; 
  grandTotalCents: number;
  status: CheckoutStatus; 
  createdAt: string; 
  updatedAt: string;
}

CheckoutSchema.virtual('id').get(function (this: { _id: Types.ObjectId }) { return this._id.toHexString(); });
CheckoutSchema.set('toJSON', { virtuals: true }); CheckoutSchema.set('toObject', { virtuals: true });

export const CheckoutModel = model<Checkout>('Checkout', CheckoutSchema);
