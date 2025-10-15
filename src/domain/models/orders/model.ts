import { model, Types, Document } from 'mongoose';
import { OrderSchema } from './schema';
export type OrderStatus = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADA' | 'CANCELADA';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type ShippingStatus = 'not_started' | 'in_transit' | 'delivered';
export interface Order {
  id: string;
  orderId: string;
  userId: string;
  checkoutId: string;
  items: OrderItem[];         
  totalCents: number;
  currency: string;
  status: OrderStatus;         
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}
OrderSchema.virtual('id').get(function (this: { _id: Types.ObjectId }) {
  return this._id.toHexString();
});
OrderSchema.set('toJSON', { virtuals: true });

export const OrderModel = model<Order>('Order', OrderSchema);


