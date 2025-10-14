import { CheckoutModel } from './model';
import { CartModel } from '../shippingCart/model';
import { ProductModel } from '../products/model';
import { UserModel } from '../users/model';

const nowISO = () => new Date().toISOString();

function calcShippingCents(subtotalCents: number, method: 'standard'|'express') {
  if (subtotalCents >= 50000) return 0;          // envío gratis ≥ 50.000
  return method === 'express' ? 18000 : 12000;   // tarifa simple
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
}) {
  const { userId, addressId, shippingMethod, paymentMethod } = params;

  // 1) traer y validar address desde el user
  const user = await UserModel.findById(userId).lean();
  if (!user) throw new Error('Usuario no existe');
  const address = (user.addresses || []).find(a => a.id === addressId);
  if (!address) throw new Error('Dirección no encontrada en el usuario');
  if (!address.city || !address.postalCode || !address.address) throw new Error('Dirección inválida');

  // 2) confirmar items + verificación final de stock/estado
  const snap = await buildItemsFromCart(userId);

  // 3) calcular envío y total
  const shippingCents = calcShippingCents(snap.subtotalCents, shippingMethod);
  const grandTotalCents = snap.subtotalCents + shippingCents;

  // 4) crear checkout (con snapshot de address)
  const payload = {
    userId,
    currency: snap.currency,
    items: snap.items,
    subtotalCents: snap.subtotalCents,
    addressId,
    addressSnapshot: address,         // ← guardamos snapshot
    shippingMethod,
    shippingCents,
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
