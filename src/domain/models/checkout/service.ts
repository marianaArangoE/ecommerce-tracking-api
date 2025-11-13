import { CheckoutModel } from './model';
import { CartModel } from '../shippingCart/model';
import { ProductModel } from '../products/model';
import { UserModel } from '../users/model';

const nowISO = () => new Date().toISOString();

function totalWeightKgOfItems(items: Array<{ productId:string; quantity:number }>, productsById: Map<string, any>) {
  let w = 0;
  for (const it of items) {
    const p = productsById.get(it.productId);
    const unit = Number(p?.weight ?? 1); // 1kg por defecto si no hay weight
    w += unit * it.quantity;
  }
  return Math.max(0, w);
}
// Estimador simple de distancia según city/postal 
// - mismo city → 5km
// - prefijo postal igual (primeros 2 dígitos) → 20km
// - caso general → 50km
function estimateDistanceKm(address: { city:string; postalCode:string }, warehouse = { city: 'Medellín', postalCode: '050001' }) {
  const sameCity = address.city.trim().toLowerCase() === warehouse.city.trim().toLowerCase();
  if (sameCity) return 5;
  const preA = String(address.postalCode || '').slice(0,2);
  const preW = String(warehouse.postalCode || '').slice(0,2);
  if (preA && preW && preA === preW) return 20;
  return 50;
}
function calcShippingCentsByWD(subtotalCents: number, totalWeightKg: number, distanceKm: number, method: 'standard'|'express') {
  if (subtotalCents >= 50000) return 0; // (iv)

  const base = 7000;                      // base
  const perKg = 1200 * Math.max(1, totalWeightKg);
  const perKm = 120 * Math.max(1, distanceKm);
  const methodAdj = method === 'express' ? 1.4 : 1.0;

  const raw = Math.round((base + perKg + perKm) * methodAdj);
  return Math.max(4000, raw);             // mínimo operativo
}
async function buildItemsFromCart(userId: string) {
  const cart: any = await CartModel.findOne({ userId }).lean();
  if (!cart || !cart.items?.length) throw new Error('El carrito está vacío');

  const items = [];
  for (const it of cart.items) {
    const prod = await ProductModel.findById(it.productId).lean();
    if (!prod) throw new Error(`Producto no existe: ${it.productId}`);
    if (prod.status !== 'active') throw new Error(`Producto no disponible: ${prod.name}`);
    if (it.quantity > prod.stock) throw new Error(`Stock insuficiente para ${prod.name}. Disponible: ${prod.stock}`);
    const unit = it.unitPriceCents; // respetamos snapshot/freeze
    items.push({
      productId: it.productId, sku: it.sku, name: it.name, image: it.image,
      quantity: it.quantity, unitPriceCents: unit, totalCents: unit * it.quantity,
    });
  }
  const subtotal = items.reduce((a, i) => a + i.totalCents, 0);
  return { items, subtotalCents: subtotal, currency: cart.currency };
}

export async function createCheckout(params: {
  userId: string;
  addressId: string;                         
  shippingMethod: 'standard'|'express';
  paymentMethod: 'card'|'transfer'|'cod';
  shippingCents?: number;
}) {
  const { userId, addressId, shippingMethod, paymentMethod, shippingCents } = params;

  // 1) traer y validar address desde el user
  const user = await UserModel.findById(userId).lean();
  if (!user) throw new Error('Usuario no existe');
  const address = (user.addresses || []).find(a => a.id === addressId);
  if (!address) throw new Error('Dirección no encontrada en el usuario');
  if (!address.city || !address.postalCode || !address.address) throw new Error('Dirección inválida');

  // 2) confirmar items + verificación final de stock/estado
  const snap = await buildItemsFromCart(userId);

  // Si shippingCents viene del frontend, lo usamos directamente; si no, lo calculamos
  let finalShippingCents: number;
  if (shippingCents !== undefined && shippingCents !== null) {
    // Validar que el valor enviado sea un número válido y positivo
    if (typeof shippingCents !== 'number' || shippingCents < 0) {
      throw new Error('shippingCents debe ser un número mayor o igual a 0');
    }
    finalShippingCents = shippingCents;
  } else {
    // Calcular shippingCents si no se proporciona desde el frontend
    const pids = snap.items.map(i => i.productId);
    const prods = await ProductModel.find({ _id: { $in: pids } }, { _id:1, weight:1 }).lean();
    const mapProds = new Map(prods.map(p => [String(p._id), p]));

    // peso total (kg) y distancia estimada (km)
    const totalWeightKg = totalWeightKgOfItems(
      snap.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      mapProds
    );
    const distanceKm = estimateDistanceKm(address);

    // costo de envío por peso/distancia + método (mantiene envío gratis si aplica)
    finalShippingCents = calcShippingCentsByWD(snap.subtotalCents, totalWeightKg, distanceKm, shippingMethod);
  }
  const grandTotalCents = snap.subtotalCents + finalShippingCents;
  // 4) crear checkout (con snapshot de address)
  const payload = {
    userId,
    currency: snap.currency,
    items: snap.items,
    subtotalCents: snap.subtotalCents,
    addressId,
    addressSnapshot: address,         // ← guardamos snapshot
    shippingMethod,
    shippingCents: finalShippingCents,
    paymentMethod,
    grandTotalCents,
    status: 'pending' as const,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const chk = await CheckoutModel.create(payload);
  return chk.toJSON();
}

export async function getCheckout(userId: string, id: string) {
  const chk = await CheckoutModel.findOne({ _id: id, userId }).lean();
  if (!chk) throw new Error('Checkout no encontrado');
  return chk;
}
