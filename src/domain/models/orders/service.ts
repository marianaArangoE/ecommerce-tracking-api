import mongoose from 'mongoose';
import { CheckoutModel } from '../checkout/model';
import { OrderModel } from './model';
import { CartModel } from '../shippingCart/model';
import { UserModel } from '../users/model';
import {
  verifyAndReserve,
  genOrderId,
  sendOrderConfirmation,
  nowISO,
  returnStock,
} from '../../services/services';

/**
 * Confirmar pedido desde un checkout:
 * - Verifica que existe y pertenece al user
 * - Idempotencia por checkoutId
 * - Verifica stock y reserva (descuenta)
 * - Crea Order (PENDIENTE, paymentStatus: pending)
 * - Marca checkout como 'confirmed' y limpia carrito
 */
export async function confirmOrder(params: { userId: string; checkoutId: string; email: string }) {
  const { userId, checkoutId, email } = params;

const ck = await CheckoutModel.findOne({ _id: checkoutId, userId });
if (!ck) throw new Error('Checkout no encontrado');

// ✅ Idempotencia primero: si ya existe la orden para este checkout, devuélvela.
const existing = await OrderModel.findOne({ checkoutId: ck.id }).lean();
if (existing) return existing;

// Luego sí valida que el checkout siga pendiente
if (ck.status && ck.status !== 'pending') {
  throw new Error(`Checkout no está pendiente (estado actual: ${ck.status})`);
}


  // Verifica stock y reserva (descuento de inventario)
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

  // Marcar checkout como confirmado
  ck.status = 'confirmed';
  ck.updatedAt = nowISO();
  await ck.save();

  // Limpiar carrito (opcional)
  await CartModel.updateOne(
    { userId },
    { $set: { items: [], subtotalCents: 0, updatedAt: nowISO() } }
  );

  // Notificar (stub)
  await sendOrderConfirmation(email, orderId);

  return order.toJSON();
}

/** Obtener una orden del cliente por id */
export async function getMyOrder(userId: string, orderId: string) {
  const ord = await OrderModel.findOne({ userId, orderId }).lean();
  if (!ord) throw new Error('Orden no encontrada');
  return ord;
}

/** Listar mis órdenes (opcionalmente por estado) */
export async function listMyOrders(
  userId: string,
  status?: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADA' | 'CANCELADA'
) {
  const q: any = { userId };
  if (status) q.status = status;
  return OrderModel.find(q).sort({ createdAt: -1 }).limit(200).lean();
}

/** ADMIN: lista paginada de PENDIENTE/PROCESANDO (o solo uno) */
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

/**
 * Cancelar orden:
 *  - Admin: cualquiera si está PENDIENTE
 *  - Customer: solo propia si está PENDIENTE
 * Con “transacción + fallback” para entornos sin replica set.
 */
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

    // 1) Cambiar estado condicionalmente (idempotencia)
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

    // 2) Devolver stock (si tienes session opcional en returnStock, pásala; si no, igual funciona)
    await returnStock(
      updated.items.map(it => ({ productId: it.productId, quantity: it.quantity }))
      // , session
    );

    await session.commitTransaction();
    session.endSession();

    // Notificar (stub)
    const user = await UserModel.findById(updated.userId).lean();
    await sendOrderCancellation(user?.email ?? 'unknown@local', updated.orderId, actor.reason ?? 'Cancelada');

    return { ok: true };
  } catch (err: any) {
    // Fallback para single-node (sin transacciones)
    session.endSession();
    const msg = String(err?.message || '');
    if (
      msg.includes('Transaction numbers are only allowed') ||
      msg.includes('does not support transactions')
    ) {
      // 1) Cambiar estado condicionalmente
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

      // 2) Devolver stock (mejor esfuerzo)
      await returnStock(
        updated.items.map(it => ({ productId: it.productId, quantity: it.quantity }))
      );

      const user = await UserModel.findById(updated.userId).lean();
      await sendOrderCancellation(user?.email ?? 'unknown@local', updated.orderId, actor.reason ?? 'Cancelada');

      return { ok: true, fallback: true };
    }
    throw err;
  }
}

/** Auto-cancelar órdenes PENDIENTE más viejas que N horas (default 48h) */
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
        // , session
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
        // Fallback sin transacción
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
        // log opcional y continuar con las demás
      }
    }
  }

  return { ok: true, processed, olderThanISO: cutoff, count: stale.length };
}

/** Avanzar estado de orden (admin): PENDIENTE → PROCESANDO → COMPLETADA */
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

  // Update idempotente/atómico (solo si sigue en el estado esperado)
  const updated = await OrderModel.findOneAndUpdate(
    { orderId, status: ord.status },
    { $set: { status: next, updatedAt: nowISO() } },
    { new: true }
  ).lean();

  if (!updated) {
    const e: any = new Error('CONFLICT');
    e.status = 409;
    throw e;
  }
  return updated;
}

/** Notificación de cancelación (stub local; puedes moverla a services.ts) */
async function sendOrderCancellation(to: string, orderId: string, reason: string) {
  console.log(`[EMAIL] Cancelación enviada a ${to}: ${orderId} (${reason})`);
  return true;
}
