import { Types } from 'mongoose';
import crypto from 'crypto';
import { ProductModel } from '../src/domain/models/products/model';
import { CartModel } from '../src/domain/models/shippingCart/model';
import { CheckoutModel } from '../src/domain/models/checkout/model';
import { OrderModel } from '../src/domain/models/orders/model';
import bcrypt from 'bcrypt';
import { UserModel } from '../src/domain/models/users/model';

export async function ensureCustomerBase(overrides: Partial<any> = {}) {
  // Crea user si no existe
  const _id = overrides._id ?? 'U1';
  const exists = await UserModel.findById(_id);
  if (exists) return exists;
  const passwordHash = overrides.passwordHash ?? await bcrypt.hash('P@ssw0rd!', 4);
  return UserModel.create({
    _id,
    email: overrides.email ?? 'c@demo.com',
    passwordHash,
    name: overrides.name ?? 'Cliente',
    role: overrides.role ?? 'customer',
    phone: overrides.phone ?? '3000000000',
    emailVerified: overrides.emailVerified ?? true,
    addresses: overrides.addresses ?? [{ id: 'ADDR1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' }],
    createdAt: new Date().toISOString(),
    failedLoginCount: 0,
    lockUntil: null,
    refreshTokens: [],
  });
}

export async function createProduct(overrides: Partial<any> = {}) {
  return ProductModel.create({
    _id: overrides._id instanceof Types.ObjectId
      ? overrides._id
      : overrides._id
      ? new Types.ObjectId(String(overrides._id).padStart(24, '0'))
      : new Types.ObjectId(),

    sku: overrides.sku ?? `SKU_${crypto.randomBytes(3).toString('hex')}`, // <- único
    name: overrides.name ?? 'Prod Demo',
    images: overrides.images ?? [],
    priceCents: overrides.priceCents ?? 1000,
    currency: overrides.currency ?? 'COP',
    stock: overrides.stock ?? 20,
    status: overrides.status ?? 'active',
    weight: overrides.weight ?? 1.2,

    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  });
}

export async function seedCart(userId = 'U1', items: Array<{ productId:string; quantity:number; unitPriceCents?:number }> = []) {
  const docs:any[] = [];
  for (const it of items) {
    const p = await ProductModel.findById(it.productId).lean();
    const unit = it.unitPriceCents ?? p!.priceCents;
    docs.push({
      productId: it.productId,
      sku: p!.sku, name: p!.name, image: p!.images?.[0],
      quantity: it.quantity, unitPriceCents: unit, totalCents: unit * it.quantity,
    });
  }
  const subtotal = docs.reduce((a, i) => a + i.totalCents, 0);
  return CartModel.create({
    userId, currency: 'COP', items: docs, subtotalCents: subtotal,
  });
}

export async function seedCheckoutFromCart(overrides: Partial<any> = {}) {
  // asume que ya hay carrito del user con items
  const cart = await CartModel.findOne({ userId: overrides.userId ?? 'U1' }).lean();
  if (!cart || !cart.items?.length) throw new Error('seedCheckoutFromCart requiere cart con items');
  return CheckoutModel.create({
    userId: overrides.userId ?? 'U1',
    currency: cart.currency,
    items: cart.items,
    subtotalCents: cart.subtotalCents,
    addressId: overrides.addressId ?? 'ADDR1',
    addressSnapshot: overrides.addressSnapshot ?? { id:'ADDR1', city:'Medellín', postalCode:'050001', address:'Calle 1' },
    shippingMethod: overrides.shippingMethod ?? 'standard',
    shippingCents: overrides.shippingCents ?? 5000,
    paymentMethod: overrides.paymentMethod ?? 'card',
    grandTotalCents: (cart.subtotalCents) + (overrides.shippingCents ?? 5000),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function seedOrderFromCheckout(overrides: Partial<any> = {}) {
  const ck = await CheckoutModel.findOne({ userId: overrides.userId ?? 'U1' }).lean();
  if (!ck) throw new Error('seedOrderFromCheckout requiere checkout previo');
  return OrderModel.create({
    userId: ck.userId,
    orderId: overrides.orderId ?? 'ORD-SEED-1',
    checkoutId: String(ck._id),
    items: ck.items,
    totalCents: ck.grandTotalCents,
    currency: ck.currency,
    status: overrides.status ?? 'PENDIENTE',
    paymentStatus: overrides.paymentStatus ?? 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
