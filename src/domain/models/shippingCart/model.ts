import { model, Types } from 'mongoose';
import { CartSchema } from './schema';
export type Currency = 'COP' | 'USD';
export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  image?: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  priceLockUntil?: Date;
}

export interface Cart {
  userId: string;
  currency: string;
  items: CartItem[];
  subtotalCents: number;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

CartSchema.virtual('id').get(function (this: { _id: Types.ObjectId }) {
  return this._id.toHexString();
});
CartSchema.set('toJSON', { virtuals: true });
CartSchema.set('toObject', { virtuals: true });

export const CartModel = model<Cart>('Cart', CartSchema);
