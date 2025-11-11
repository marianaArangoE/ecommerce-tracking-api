
import crypto from 'crypto';
import mongoose, { Types, Model } from 'mongoose';
import { ProductModel as ProductM } from '../src/infrastructure/schemas/productSchema';

import { CartModel } from '../src/domain/models/shippingCart/shippingCartModel';
import { CheckoutModel } from '../src/domain/models/checkout/checkoutModel';
import { OrderModel } from '../src/domain/models/orders/orderModel';
import bcrypt from 'bcrypt';
import { UserModel } from '../src/domain/models/users/userModel';


const ProductModel = ProductM as unknown as Model<any>;

// ---------- USERS ----------
export async function ensureCustomerBase(overrides: Partial<any> = {}) {
  const _id = overrides._id ?? 'U1';
  const exists = await UserModel.findById(_id);
  if (exists) return exists;

  const passwordHash = overrides.passwordHash ?? await bcrypt.hash('P@ssw0rd!', 4);

  const nowISO = new Date().toISOString();

  return UserModel.create({
    _id,
    email: overrides.email ?? 'c@demo.com',
    passwordHash,
    name: overrides.name ?? 'Cliente',
    role: overrides.role ?? 'customer',
    phone: overrides.phone ?? '3000000000',
    emailVerified: overrides.emailVerified ?? true,
    addresses: overrides.addresses ?? [
      { id: 'ADDR1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' },
    ],
    failedLoginCount: 0,
    lockUntil: null,
    refreshTokens: [],
    createdAt: overrides.createdAt ?? nowISO,
    updatedAt: overrides.updatedAt ?? nowISO,
  });
}

// ---------- PRODUCTS ----------
let __skuSeq = 1;
export async function createProduct(overrides: Partial<any> = {}) {
  const _id =
    overrides._id instanceof Types.ObjectId
      ? overrides._id
      : overrides._id
      ? new Types.ObjectId(String(overrides._id).padStart(24, '0'))
      : new Types.ObjectId();

  
  const id = overrides.id ?? String(_id);
  const priceNum = overrides.priceCents ?? 1000;
  const priceDecimal =
    typeof priceNum === 'number'
      ? mongoose.Types.Decimal128.fromString(String(priceNum))
      : mongoose.Types.Decimal128.fromString(String(Number(priceNum)));

  const data: any = {
    _id,
    id,
    sku: overrides.sku ?? `SKU_${__skuSeq++}_${crypto.randomBytes(2).toString('hex')}`,
    name: overrides.name ?? 'Prod Demo',
    priceCents: priceDecimal,          
    currency: overrides.currency ?? 'COP',
    stock: overrides.stock ?? 20,
    status: overrides.status ?? 'active',
    images: overrides.images ?? [],      // requerido pero puede ser []
    description: overrides.description ?? 'Producto de prueba',
    categoryId: overrides.categoryId ?? undefined,
    brand: overrides.brand ?? undefined,
    tags: overrides.tags ?? [],
  };

  return ProductModel.create(data as any);

}

// ---------- CART ----------

export async function seedCart(
  userId = 'U1',
  items: Array<{ productId: string; quantity: number; unitPriceCents?: number }> = []
) {
  const docs: any[] = [];

  for (const it of items) {
    const p = (await ProductModel.findById(it.productId).lean({ getters: true } as any)) as any;
    if (!p) throw new Error(`Producto no encontrado ${it.productId}`);
    const fromDoc =
      typeof p.priceCents === 'number'
        ? p.priceCents
        : Number(p.priceCents?.toString?.() ?? p.priceCents);

    const unit = typeof it.unitPriceCents === 'number' ? it.unitPriceCents : fromDoc;
    if (Number.isNaN(unit)) throw new Error(`priceCents inválido para product ${it.productId}`);

    docs.push({
      productId: it.productId,
      sku: p.sku,
      name: p.name,
      image: Array.isArray(p.images) ? p.images[0] : undefined,
      quantity: it.quantity,
      unitPriceCents: unit,
      totalCents: unit * it.quantity,
    });
  }

  const subtotal = docs.reduce((a, i) => a + i.totalCents, 0);

  return CartModel.create({
    userId,
    currency: 'COP',
    items: docs,
    subtotalCents: subtotal,
  });
}
// ---------- CHECKOUT ----------
export async function seedCheckoutFromCart(overrides: Partial<any> = {}) {
  const userId = overrides.userId ?? 'U1';
  const cart = await CartModel.findOne({ userId }).lean();
  if (!cart || !cart.items?.length) {
    throw new Error('seedCheckoutFromCart requiere cart con items');
  }

  const shippingCents = overrides.shippingCents ?? 5000;

  return CheckoutModel.create({
    userId,
    currency: cart.currency,
    items: cart.items,
    subtotalCents: cart.subtotalCents,
    addressId: overrides.addressId ?? 'ADDR1',
    addressSnapshot:
      overrides.addressSnapshot ?? { id: 'ADDR1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' },
    shippingMethod: overrides.shippingMethod ?? 'standard',
    shippingCents,
    paymentMethod: overrides.paymentMethod ?? 'card',
    grandTotalCents: cart.subtotalCents + shippingCents,
    status: 'pending',

  });
}

// ---------- ORDER ----------
export async function seedOrderFromCheckout(overrides: Partial<any> = {}) {
  const userId = overrides.userId ?? 'U1';
  const ck = await CheckoutModel.findOne({ userId }).lean();
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
 
  });
}
