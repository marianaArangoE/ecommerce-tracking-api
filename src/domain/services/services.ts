import mongoose from 'mongoose';
import { ProductModel } from '../models/products/productModel';

// Fecha ISO
export const nowISO = () => new Date().toISOString();

// ID de orden: ORD-YYYYMMDD-XXXXX (A–Z, 0–9)
export function genOrderId(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase(); // 5 chars
  return `ORD-${y}${m}${d}-${rand}`;
}

/**
 * Verifica y reserva stock de forma segura.
 * - Si tu Mongo está en Replica Set, usa transacción.
 * - Si no, hace reservas condicionales con rollback manual.
 */
export async function verifyAndReserve(
  items: Array<{ productId: string; quantity: number }>
) {
  // Intenta con transacción (si el cluster la soporta)
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Verificación + reserva condicional (en un solo paso por ítem)
    for (const { productId, quantity } of items) {
      const upd = await ProductModel.updateOne(
        { _id: productId, status: 'active', stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { session }
      );
      if (upd.modifiedCount === 0) {
        throw new Error(`OUT_OF_STOCK:${productId}`);
      }
    }

    await session.commitTransaction();
    session.endSession();
    return;
  } catch (err: any) {
    if (session) {
      try { await session.abortTransaction(); } catch {}
      session.endSession();
    }
    // Si falla porque no hay transacciones (Standalone), fallback sin transacción:
    if (String(err?.message || '').includes('Transaction') || String(err?.code || '') === 'NoSuchTransaction') {
      await verifyAndReserveNonTx(items);
      return;
    }
    throw err;
  }
}

/** Fallback sin transacción: reserva condicional con rollback manual */
async function verifyAndReserveNonTx(
  items: Array<{ productId: string; quantity: number }>
) {
  const reserved: Array<{ productId: string; quantity: number }> = [];
  try {
    for (const { productId, quantity } of items) {
      // Verifica y descuenta en una sola operación
      const upd = await ProductModel.updateOne(
        { _id: productId, status: 'active', stock: { $gte: quantity } },
        { $inc: { stock: -quantity } }
      );
      if (upd.modifiedCount === 0) {
        throw new Error(`OUT_OF_STOCK:${productId}`);
      }
      reserved.push({ productId, quantity });
    }
  } catch (e) {
    // Rollback manual de lo ya reservado
    for (const r of reserved) {
      await ProductModel.updateOne({ _id: r.productId }, { $inc: { stock: r.quantity } });
    }
    throw e;
  }
}

/** Devolver stock (p. ej. cancelaciones) */
export async function returnStock(
  items: Array<{ productId: string; quantity: number }>,
  session?: mongoose.ClientSession | null
) {
  for (const it of items) {
    await ProductModel.updateOne(
      { _id: it.productId },
      { $inc: { stock: +it.quantity } },
      session ? { session } : {}
    );
  }
}

/** Email de confirmación de orden - ahora usando emailService */
export { sendOrderConfirmation } from './emailService';
