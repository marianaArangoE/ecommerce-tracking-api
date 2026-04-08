import mongoose from 'mongoose';
import { CheckoutModel } from '../models/checkout/checkoutModel';
import { OrderModel } from '../models/orders/orderModel';
import { CartModel } from '../models/shippingCart/shippingCartModel';
import { UserModel } from '../models/users/userModel';
import {
  verifyAndReserve,
  genOrderId,
  nowISO,
  returnStock,
} from './services';
import { sendOrderConfirmation, OrderEmailData } from './emailService';
import { OrderStatus } from '../models/orders/orderStatus'; 

export type OrderTrackingDTO = {
  orderId: string;
  trackingStatus: OrderStatus;
  trackingHistory: { at: Date | string; status: OrderStatus; by?: string }[];
};

export async function confirmOrder(params: { userId: string; checkoutId: string; email: string }) {
  const { userId, checkoutId, email } = params;

  const ck = await CheckoutModel.findOne({ _id: checkoutId, userId });
  if (!ck) throw new Error('Checkout no encontrado');

  const existing = await OrderModel.findOne({ checkoutId: ck.id }).lean();
  if (existing) return existing;

  if (ck.status && ck.status !== 'pending') {
    throw new Error(`Checkout no está pendiente (estado actual: ${ck.status})`);
  }

  await verifyAndReserve(ck.items.map(i => ({ productId: i.productId, quantity: i.quantity })));

  const orderId = genOrderId();
  const order = await OrderModel.create({
    userId,
    orderId,
    checkoutId: ck.id,
    items: ck.items,
    totalCents: ck.grandTotalCents,
    currency: ck.currency,
    status: 'PENDIENTE',
    paymentStatus: 'pending',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });

  ck.status = 'confirmed';
  ck.updatedAt = nowISO();
  await ck.save();

  await CartModel.updateOne(
    { userId },
    { $set: { items: [], subtotalCents: 0, updatedAt: nowISO() } }
  );

  // Obtener datos del usuario para el email
  const user = await UserModel.findById(userId).lean();
  const customerName = user?.name || 'Cliente';

  // Preparar datos para el email
  const emailData: OrderEmailData = {
    orderId: order.orderId,
    customerName,
    customerEmail: email,
    items: ck.items.map(item => ({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.totalCents,
    })),
    subtotalCents: ck.subtotalCents,
    shippingCents: ck.shippingCents || 0,
    totalCents: ck.grandTotalCents,
    currency: ck.currency,
    address: {
      city: ck.addressSnapshot.city,
      postalCode: ck.addressSnapshot.postalCode,
      address: ck.addressSnapshot.address,
    },
    shippingMethod: ck.shippingMethod,
    paymentMethod: ck.paymentMethod,
    createdAt: order.createdAt,
  };

  // Enviar email de confirmación (no bloquea si falla)
  try {
    await sendOrderConfirmation(emailData);
  } catch (error) {
    console.error('Error al enviar email de confirmación:', error);
    // No lanzar error para no romper el flujo de creación de orden
  }

  return order.toJSON();
}


export async function getMyOrder(userId: string, orderId: string) {
  const ord = await OrderModel.findOne({ userId, orderId }).lean();
  if (!ord) throw new Error('Orden no encontrada');
  return ord;
}


export async function listMyOrders(
  userId: string,
  status?: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADA' | 'CANCELADA'
) {
  const q: any = { userId };
  if (status) q.status = status;
  return OrderModel.find(q).sort({ createdAt: -1 }).limit(200).lean();
}
export async function adminListOrders(params: {
  status?: 'PENDIENTE' | 'PROCESANDO';
  limit?: number;
  page?: number;
}) {
  const { status, limit = 50, page = 1 } = params || {};
  const q: any = {};
  q.status = status ? status : { $in: ['PENDIENTE', 'PROCESANDO'] };

  const [items, total] = await Promise.all([
    OrderModel.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    OrderModel.countDocuments(q),
  ]);

  return { items, total, page, limit };
}


export async function cancelOrder(
  orderId: string,
  actor: { role: 'admin' | 'customer'; userId: string; reason?: string }
) {
  const ord = await OrderModel.findOne({ orderId });
  if (!ord) throw new Error('ORDER_NOT_FOUND');

  if (ord.status !== 'PENDIENTE') {
    const e: any = new Error('CANNOT_CANCEL_NON_PENDING');
    e.status = 400;
    throw e;
  }

  if (actor.role === 'customer' && ord.userId !== actor.userId) {
    const e: any = new Error('FORBIDDEN');
    e.status = 403;
    throw e;
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const updated = await OrderModel.findOneAndUpdate(
      { orderId, status: 'PENDIENTE' },
      { $set: { status: 'CANCELADA', updatedAt: nowISO() } },
      { new: true, session }
    );
    if (!updated) {
      await session.abortTransaction();
      session.endSession();
      const e: any = new Error('CANNOT_CANCEL_NON_PENDING');
      e.status = 400;
      throw e;
    }

    await returnStock(
      updated.items.map(it => ({ productId: it.productId, quantity: it.quantity }))
    );

    await session.commitTransaction();
    session.endSession();

    const user = await UserModel.findById(updated.userId).lean();
    await sendOrderCancellation(user?.email ?? 'unknown@local', updated.orderId, actor.reason ?? 'Cancelada');

    return { ok: true };
  } catch (err: any) {
    session.endSession();
    const msg = String(err?.message || '');
    if (
      msg.includes('Transaction numbers are only allowed') ||
      msg.includes('does not support transactions')
    ) {
      const updated = await OrderModel.findOneAndUpdate(
        { orderId, status: 'PENDIENTE' },
        { $set: { status: 'CANCELADA', updatedAt: nowISO() } },
        { new: true }
      );
      if (!updated) {
        const e: any = new Error('CANNOT_CANCEL_NON_PENDING');
        e.status = 400;
        throw e;
      }

      await returnStock(
        updated.items.map(it => ({ productId: it.productId, quantity: it.quantity }))
      );

      const user = await UserModel.findById(updated.userId).lean();
      await sendOrderCancellation(
        user?.email ?? 'unknown@local',
        updated.orderId,
        actor.reason ?? 'Cancelada'
      );

      return { ok: true, fallback: true };
    }
    throw err;
  }
}

export async function autoCancelStalePending(hours = 48) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const stale = await OrderModel.find({
    status: 'PENDIENTE',
    createdAt: { $lt: cutoff },
  }).lean();

  let processed = 0;

  for (const o of stale) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updated = await OrderModel.findOneAndUpdate(
        { orderId: o.orderId, status: 'PENDIENTE' },
        { $set: { status: 'CANCELADA', updatedAt: nowISO() } },
        { new: true, session }
      );
      if (!updated) {
        await session.abortTransaction();
        session.endSession();
        continue;
      }

      await returnStock(
        updated.items.map(it => ({ productId: it.productId, quantity: it.quantity }))
      );

      await session.commitTransaction();
      session.endSession();

      const user = await UserModel.findById(updated.userId).lean();
      await sendOrderCancellation(
        user?.email ?? 'unknown@local',
        updated.orderId,
        'Auto-cancel por 48h sin procesamiento'
      );

      processed++;
    } catch (err: any) {
      session.endSession();
      const msg = String(err?.message || '');
      if (
        msg.includes('Transaction numbers are only allowed') ||
        msg.includes('does not support transactions')
      ) {
        const updated = await OrderModel.findOneAndUpdate(
          { orderId: o.orderId, status: 'PENDIENTE' },
          { $set: { status: 'CANCELADA', updatedAt: nowISO() } },
          { new: true }
        );
        if (!updated) continue;

        await returnStock(
          updated.items.map(it => ({ productId: it.productId, quantity: it.quantity }))
        );

        const user = await UserModel.findById(updated.userId).lean();
        await sendOrderCancellation(
          user?.email ?? 'unknown@local',
          updated.orderId,
          'Auto-cancel por 48h sin procesamiento'
        );

        processed++;
      } else {
      }
    }
  }

  return { ok: true, processed, olderThanISO: cutoff, count: stale.length };
}

export async function advanceOrderStatus(orderId: string, next: 'PROCESANDO' | 'COMPLETADA') {
  const ord = await OrderModel.findOne({ orderId });
  if (!ord) {
    const e: any = new Error('ORDER_NOT_FOUND');
    e.status = 404;
    throw e;
  }

  const allowed: Record<string, Array<'PROCESANDO' | 'COMPLETADA'>> = {
    PENDIENTE: ['PROCESANDO', 'COMPLETADA'],
    PROCESANDO: ['COMPLETADA'],
    COMPLETADA: [],
    CANCELADA: [],
  };

  const can = allowed[ord.status] || [];
  if (!can.includes(next)) {
    const e: any = new Error(`INVALID_TRANSITION: ${ord.status} -> ${next}`);
    e.status = 400;
    throw e;
  }

  const update: any = { $set: { status: next, updatedAt: nowISO() } };
  if (next === 'PROCESANDO') {
    update.$set.trackingStatus = OrderStatus.PREPARANDO_PEDIDO;
    update.$push = {
      ...(update.$push || {}),
      trackingHistory: { at: new Date(), status: OrderStatus.PREPARANDO_PEDIDO, by: 'system' }
    };
  }

  const updated = await OrderModel.findOneAndUpdate(
    { orderId, status: ord.status },
    update,
    { new: true }
  ).lean();

  if (!updated) {
    const e: any = new Error('CONFLICT');
    e.status = 409;
    throw e;
  }
  return updated;
}


export async function getOrderTracking(orderId: string): Promise<OrderTrackingDTO> {
  const ord = await OrderModel.findOne(
    { orderId },
    { _id: 0, orderId: 1, trackingStatus: 1, trackingHistory: 1 }
  ).lean<OrderTrackingDTO>();

  if (!ord) { 
    const e: any = new Error('ORDER_NOT_FOUND'); 
    e.status = 404; 
    throw e; 
  }
  return ord;
}

export async function updateOrderTrackingStatus(
  orderId: string,
  next: OrderStatus,
  actorId?: string
): Promise<OrderTrackingDTO> {
  const updated = await OrderModel.findOneAndUpdate(
    { orderId },
    {
      $set: { trackingStatus: next, updatedAt: nowISO() },
      $push: { trackingHistory: { at: new Date(), status: next, by: actorId } }
    },
    {
      new: true,
      projection: { _id: 0, orderId: 1, trackingStatus: 1, trackingHistory: 1 }
    }
  ).lean<OrderTrackingDTO>();

  if (!updated) { 
    const e: any = new Error('ORDER_NOT_FOUND'); 
    e.status = 404; 
    throw e; 
  }
  return updated;
}

export async function customerConfirmDelivery(userId: string, orderId: string): Promise<OrderTrackingDTO> {
  const ord = await OrderModel.findOne(
    { orderId, userId },
    { _id: 0, orderId: 1, status: 1, trackingStatus: 1, trackingHistory: 1 }
  ).lean<{ orderId: string; status: string; trackingStatus?: OrderStatus; trackingHistory: any[] }>();

  if (!ord) {
    const e: any = new Error('ORDER_NOT_FOUND');
    e.status = 404;
    throw e;
  }

  if (ord.status === 'COMPLETADA' && ord.trackingStatus === OrderStatus.COMPLETADO) {
    return {
      orderId: ord.orderId,
      trackingStatus: OrderStatus.COMPLETADO,
      trackingHistory: ord.trackingHistory ?? [],
    };
  }

 
  const allowedBusiness = ['PROCESANDO', 'COMPLETADA'];
  if (!allowedBusiness.includes(ord.status)) {
    const e: any = new Error('ORDER_NOT_READY_TO_CONFIRM');
    e.status = 400;
    throw e;
  }
const updated = await OrderModel.findOneAndUpdate(
    { orderId, userId },
    {
      $set: {
        trackingStatus: OrderStatus.COMPLETADO,
        status: 'COMPLETADA',
        updatedAt: nowISO(),
        customerConfirmedAt: nowISO(),
        customerConfirmedBy: userId,
        customerConfirmationSource: 'api',
      },
      $push: {
        trackingHistory: { at: new Date(), status: OrderStatus.COMPLETADO, by: userId },
      },
    },
    {
      new: true,
      projection: { _id: 0, orderId: 1, trackingStatus: 1, trackingHistory: 1 },
    }
  ).lean<OrderTrackingDTO>();

  if (!updated) {
    const e: any = new Error('ORDER_NOT_FOUND');
    e.status = 404;
    throw e;
  }

  return updated;
}
async function sendOrderCancellation(to: string, orderId: string, reason: string) {
  console.log(`[EMAIL] Cancelación enviada a ${to}: ${orderId} (${reason})`);
  return true;
}
 