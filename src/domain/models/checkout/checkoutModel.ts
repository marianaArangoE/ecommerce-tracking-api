// import { model, Types } from 'mongoose';
// import { CheckoutSchema } from './schema';

// export type ShippingMethod = 'standard'|'express';
// export type PaymentMethod  = 'card'|'transfer'|'cod';
// export type CheckoutStatus = 'pending'|'confirmed'|'cancelled'|'expired';
// export interface Checkout {
//   id: string;                 // Identificador único del checkout
//   cartId: string;             // Referencia al carrito actual
//   userId: string;             // Usuario autenticado
//   addressId: string;          // Dirección seleccionada (User.addresses)
//   paymentMethodId: string;    // Referencia al método de pago elegido
//   totalCents: number;         // Total del carrito confirmado
//   currency: string;           // Ej: "COP"
//   status: CheckoutStatus;     // "pending" | "completed" | "cancelled"
//   createdAt: string;
//   updatedAt: string;
// }

// src/domain/models/checkout/model.ts
import { model, Types } from 'mongoose';
import { CheckoutSchema } from '../../../infrastructure/schemas/checkoutSchema';

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
