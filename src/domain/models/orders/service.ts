import { CheckoutModel } from '../checkout/model';
import { OrderModel } from './model';
import { verifyAndReserve, genOrderId, sendOrderConfirmation, nowISO } from '../../services/services';
import { CartModel } from '../shippingCart/model';



/**
 * Confirmar pedido desde un checkout:
 * - Verifica que el checkout existe y pertenece al user
 * - Evita doble confirmación del mismo checkout
 * - Verifica stock y reserva (descuenta)
 * - Crea Order con estado inicial PENDIENTE y paymentStatus pending
 * - Marca el checkout como 'confirmed'
 * - Opcional: limpia el carrito
 */
export async function confirmOrder(params: { userId: string; checkoutId: string; email: string; }) {
  const { userId, checkoutId, email } = params;

  const ck = await CheckoutModel.findOne({ _id: checkoutId, userId });
  if (!ck) throw new Error('Checkout no encontrado');
  if (ck.status && ck.status !== 'pending') {
    throw new Error(`Checkout no está pendiente (estado actual: ${ck.status})`);
  }

  // Idempotencia: ¿ya existe una orden para este checkout?
  const existing = await OrderModel.findOne({ checkoutId: ck.id }).lean();
  if (existing) return existing; // simplemente devuelve la existente

  // Seguridad: verifica stock y reserva (descuenta inventario)
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

  // (Opcional) limpiar carrito
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
export async function listMyOrders(userId: string, status?: 'PENDIENTE'|'PROCESANDO'|'COMPLETADA'|'CANCELADA') {
  const q: any = { userId };
  if (status) q.status = status;
  return OrderModel.find(q).sort({ createdAt: -1 }).limit(200).lean();
}
