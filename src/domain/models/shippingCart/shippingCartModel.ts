import { model, Types } from 'mongoose';
import { CartSchema } from '../../../infrastructure/schemas/shippingCartSchema';
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
  currency: Currency;
  items: CartItem[];
  subtotalCents: number;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

CartSchema.virtual('id').get(function (this: { _id: Types.ObjectId }) {
  return this._id.toHexString();
});

export const CartModel = model<Cart>('Cart', CartSchema);
