
import mongoose from 'mongoose';
import { OrderModel, Order } from './model';
import { ProductModel } from '../products/model';
import { CheckoutModel } from '../checkout/model';
import { CartModel } from '../shippingCart/model';
import { UserModel } from '../users/model';
import { 
  verifyAndReserve, 
  returnStock, 
  genOrderId, 
  nowISO, 
  sendOrderConfirmation
} from '../../services/services'; // Asumiendo que estos servicios existen

// --- FUNCIONES AYUDANTES ---

/** Pequeña fábrica para crear errores HTTP de forma consistente. */
function httpError(message: string, status = 400) {
  const e: any = new Error(message);
  e.status = status;
  return e;
}

/** * VERIFICADOR DE PERMISOS DE VENDEDOR.
 * Revisa si una orden contiene al menos un producto que le pertenece al vendedor.
 */
async function _verifyAdminPermissionForOrder(order: Order, adminId: string) {
  const productIdsInOrder = order.items.map(item => item.productId);
  const count = await ProductModel.countDocuments({
    _id: { $in: productIdsInOrder },
    vendorId: adminId, // Asumimos que tu modelo de Producto tiene 'vendorId'
  });
  if (count === 0) {
    throw httpError('FORBIDDEN_VENDOR', 403);
  }
}

// --- FUNCIONES PARA CLIENTES ---

/**
 * Confirma un checkout y lo convierte en una orden oficial.
 */
export async function confirmOrder(params: { userId: string; checkoutId: string; email: string }) {
  const { userId, checkoutId, email } = params;
  
  console.log('[CONFIRM ORDER] 1. Iniciando proceso...');
  
  const ck = await CheckoutModel.findOne({ _id: checkoutId, userId });
  if (!ck) throw httpError('CHECKOUT_NOT_FOUND', 404);
  console.log('[CONFIRM ORDER] 2. Checkout encontrado.');

  const existing = await OrderModel.findOne({ checkoutId: ck.id }).lean();
  if (existing) return existing;
  console.log('[CONFIRM ORDER] 3. No es un duplicado, continuando...');
  
  if (ck.status !== 'pending') {
    throw httpError(`CHECKOUT_NOT_PENDING_${ck.status}`, 400);
  }

  // --- SOSPECHOSO #1 ---
  console.log('[CONFIRM ORDER] 4. A punto de verificar y reservar stock...');
  await verifyAndReserve(ck.items.map(i => ({ productId: i.productId, quantity: i.quantity })));
  console.log('[CONFIRM ORDER] 5. Stock verificado y reservado.');
  // --- FIN SOSPECHOSO #1 ---

  const order = await OrderModel.create({ /* ...datos de la orden... */ });
  console.log('[CONFIRM ORDER] 6. Orden creada en la base de datos.');

  ck.status = 'confirmed';
  await ck.save();
  console.log('[CONFIRM ORDER] 7. Checkout marcado como confirmado.');

  await CartModel.updateOne({ userId, status: 'active' }, { $set: { items: [] } });
  console.log('[CONFIRM ORDER] 8. Carrito limpiado.');

  // --- SOSPECHOSO #2 ---
  console.log('[CONFIRM ORDER] 9. A punto de enviar email de confirmación...');
  await sendOrderConfirmation(email, order.orderId);
  console.log('[CONFIRM ORDER] 10. Email (supuestamente) enviado.');
  // --- FIN SOSPECHOSO #2 ---

  return order.toJSON();
}

/** Obtiene una orden específica de un cliente, verificando que sea suya. */
export async function getMyOrder(userId: string, orderId: string) {
  const ord = await OrderModel.findOne({ userId, orderId }).lean();
  if (!ord) throw httpError('ORDER_NOT_FOUND', 404);
  return ord;
}

/** Lista todas las órdenes de un cliente. */
export async function listMyOrders(userId: string, status?: Order['status']) {
  const query: any = { userId };
  if (status) query.status = status;
  return OrderModel.find(query).sort({ createdAt: -1 }).limit(200).lean();
}


// --- FUNCIONES PARA CLIENTES Y VENDEDORES (CON LÓGICA DE PERMISOS) ---

/**
 * Cancela una orden.
 * - Cliente: solo puede cancelar sus propias órdenes si están PENDIENTES.
 * - Vendedor: solo puede cancelar órdenes que contengan sus productos si están PENDIENTES.
 */
export async function cancelOrder(
  orderId: string,
  actor: { role: 'admin' | 'customer'; userId: string }
) {
  const ord = await OrderModel.findOne({ orderId });
  if (!ord) throw httpError('ORDER_NOT_FOUND', 404);

  // Regla 1: Solo se pueden cancelar órdenes PENDIENTES.
  if (ord.status !== 'PENDIENTE') {
    throw httpError('CANNOT_CANCEL_NON_PENDING', 400);
  }

  // Regla 2: Verificación de permisos según el rol.
  if (actor.role === 'customer' && ord.userId !== actor.userId) {
    throw httpError('FORBIDDEN', 403);
  }
  if (actor.role === 'admin') {
    await _verifyAdminPermissionForOrder(ord, actor.userId);
  }

  // Lógica de cancelación y devolución de stock
  ord.status = 'CANCELADA';
  ord.updatedAt = nowISO();
  await ord.save();

  await returnStock(ord.items.map(it => ({ productId: it.productId, quantity: it.quantity })));

  console.log(`[EVENTO] Orden ${orderId} cancelada por ${actor.role} ${actor.userId}`);
  return { ok: true, order: ord.toJSON() };
}

/**
 * [VENDEDOR] Avanza el estado de una orden.
 * Solo puede hacerlo si la orden contiene productos que le pertenecen.
 */
export async function advanceOrderStatus(orderId: string, nextStatus: 'PROCESANDO' | 'COMPLETADA', adminId: string) {
  const ord = await OrderModel.findOne({ orderId });
  if (!ord) throw httpError('ORDER_NOT_FOUND', 404);

  // Verificamos que el vendedor tenga permiso sobre esta orden.
  await _verifyAdminPermissionForOrder(ord, adminId);

  // Verificamos que la transición de estado sea válida (ej: no se puede pasar de COMPLETADA a PROCESANDO).
  const allowedTransitions: Record<string, string[]> = {
    PENDIENTE: ['PROCESANDO', 'COMPLETADA'],
    PROCESANDO: ['COMPLETADA'],
  };

  const canTransition = allowedTransitions[ord.status]?.includes(nextStatus);
  if (!canTransition) {
    throw httpError(`INVALID_TRANSITION: ${ord.status} -> ${nextStatus}`, 400);
  }

  ord.status = nextStatus;
  ord.updatedAt = nowISO();
  await ord.save();

  console.log(`[EVENTO] Orden ${orderId} avanzada a ${nextStatus} por vendedor ${adminId}`);
  return ord.toJSON();
}