import { ProductModel } from '../models/products/model';

// Utilidad de fecha ISO
export const nowISO = () => new Date().toISOString();

//  Generador de IDs de orden
export function genOrderId(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${y}${m}${d}-${rand}`;
}

//  Verificación y reserva de stock (descuento inmediato)
export async function verifyAndReserve(items: Array<{ productId: string; quantity: number }>) {
  // Verificación previa
  for (const it of items) {
    const prod = await ProductModel.findById(it.productId);
    if (!prod) throw new Error('Producto no existe');
    if (prod.status !== 'active') throw new Error(`Producto no disponible: ${it.productId}`);
    if (prod.stock < it.quantity) throw new Error(`Sin stock suficiente para ${prod.name}`);
  }
  // Reserva (descuento)
  for (const it of items) {
    await ProductModel.updateOne({ _id: it.productId }, { $inc: { stock: -it.quantity } });
  }
}

//  Devolver stock (cancelaciones)
export async function returnStock(items: Array<{ productId: string; quantity: number }>) {
  for (const it of items) {
    await ProductModel.updateOne({ _id: it.productId }, { $inc: { stock: +it.quantity } });
  }
}

//  Email stub – reemplaza luego por provider real como gmail (no se como se implementara)
export async function sendOrderConfirmation(to: string, orderId: string) {
  console.log(`[EMAIL] Confirmación enviada a ${to}: ${orderId}`);
}
