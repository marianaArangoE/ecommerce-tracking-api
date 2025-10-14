import { CartModel } from './model';
import { ProductModel } from '../products/model';

const H24 = 24 * 60 * 60 * 1000;
const H2  =  2 * 60 * 60 * 1000;

const nowISO = () => new Date().toISOString();
const nowMs  = () => Date.now();

function recalc(cart: any) {
  let subtotal = 0;
  for (const it of cart.items) {
    it.totalCents = it.quantity * it.unitPriceCents;
    subtotal += it.totalCents;
  }
  cart.subtotalCents = subtotal;
  cart.updatedAt = nowISO();
}

function isExpired(cart: any) {
  const last = new Date(cart.updatedAt).getTime();
  return (nowMs() - last) > H24;
}

async function getProductOrThrow(productId: string) {
  const prod = await ProductModel.findById(productId).lean();
  if (!prod) throw new Error('Producto no existe');
  if (prod.status !== 'active') throw new Error('Producto no disponible');
  return prod;
}

function resolvePriceFreeze(prod: any, existing?: any) {

  if (existing?.priceFrozenUntil && nowMs() < Date.parse(existing.priceFrozenUntil)) {
    return { unitPriceCents: existing.unitPriceCents, priceFrozenUntil: existing.priceFrozenUntil };
  }
  
  return { unitPriceCents: prod.priceCents, priceFrozenUntil: new Date(nowMs() + H2).toISOString() };
}

/** GET/CREATE con expiración 24h */
export async function getOrCreateCart(userId: string, currency = 'COP') {
  if (!userId) throw new Error('userId requerido');

  let cart = await CartModel.findOne({ userId });
  if (!cart) {
    cart = await CartModel.create({
      userId, currency, items: [], subtotalCents: 0,
      createdAt: nowISO(), updatedAt: nowISO(),
    });
    return cart.toJSON();
  }

  // carrito expira por inactividad (24h)
  if (isExpired(cart)) {
    cart.items = [];
    cart.subtotalCents = 0;
    cart.updatedAt = nowISO();
    await cart.save();
  }
  return cart.toJSON();
}

/** a) Añadir producto (suma cantidades si ya existe) + c(i,iii,iv) */
export async function addItem(params: { userId: string; productId: string; quantity: number; }) {
  const { userId, productId, quantity } = params;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    throw new Error('quantity debe ser entero 1..999');
  }

  const raw = await CartModel.findOne({ userId }) || await CartModel.create({
    userId, currency: 'COP', items: [], subtotalCents: 0, createdAt: nowISO(), updatedAt: nowISO(),
  });
  const cart: any = raw;

  if (isExpired(cart)) {
    cart.items = [];
    cart.subtotalCents = 0;
  }

  const prod = await getProductOrThrow(productId);
  if (cart.currency !== prod.currency) throw new Error('Moneda del producto no coincide con el carrito');

  const existing = cart.items.find((i: any) => i.productId === productId);

  // precio congelado 2h
  const { unitPriceCents, priceFrozenUntil } = resolvePriceFreeze(prod, existing);

  // stock en tiempo real
  const desiredQty = (existing?.quantity || 0) + quantity;
  if (desiredQty > prod.stock) {
    throw new Error(`Stock insuficiente. Disponible: ${prod.stock}`);
  }

  if (existing) {
    existing.quantity = desiredQty;
    existing.unitPriceCents = unitPriceCents;
    existing.priceFrozenUntil = priceFrozenUntil;
    existing.sku = prod.sku;
    existing.name = prod.name;
    if (prod.images?.length) existing.image = prod.images[0];
  } else {
    cart.items.push({
      productId,
      sku: prod.sku,
      name: prod.name,
      image: prod.images?.[0],
      quantity,
      unitPriceCents,
      totalCents: 0,
      priceFrozenUntil,
    });
  }

  recalc(cart);
  await cart.save();
  return cart.toJSON();
}

/** a) Set cantidad específica + c(iii,iv) */
export async function setItemQuantity(params: { userId: string; productId: string; quantity: number; }) {
  const { userId, productId, quantity } = params;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    throw new Error('quantity debe ser entero 1..999');
  }

  const cart: any = await CartModel.findOne({ userId });
  if (!cart) throw new Error('No hay carrito');

  if (isExpired(cart)) {
    cart.items = [];
    cart.subtotalCents = 0;
    recalc(cart);
    await cart.save();
    throw new Error('Carrito expirado por inactividad');
  }

  const item = cart.items.find((i: any) => i.productId === productId);
  if (!item) throw new Error('El producto no está en el carrito');

  const prod = await getProductOrThrow(productId);
  if (quantity > prod.stock) throw new Error(`Stock insuficiente. Disponible: ${prod.stock}`);

  const { unitPriceCents, priceFrozenUntil } = resolvePriceFreeze(prod, item);
  item.quantity = quantity;
  item.unitPriceCents = unitPriceCents;
  item.priceFrozenUntil = priceFrozenUntil;

  recalc(cart);
  await cart.save();
  return cart.toJSON();
}

/** a) Remover ítem */
export async function removeItem(params: { userId: string; productId: string; }) {
  const { userId, productId } = params;
  const cart: any = await CartModel.findOne({ userId });
  if (!cart) throw new Error('No hay carrito');

  const idx = cart.items.findIndex((i: any) => i.productId === productId);
  if (idx === -1) throw new Error('El producto no está en el carrito');

  cart.items.splice(idx, 1);
  recalc(cart);
  await cart.save();
  return cart.toJSON();
}

/** b) Obtener carrito (recalcula) */
export async function getMyCart(userId: string) {
  const cart: any = await CartModel.findOne({ userId }) || await CartModel.create({
    userId, currency: 'COP', items: [], subtotalCents: 0, createdAt: nowISO(), updatedAt: nowISO(),
  });

  if (isExpired(cart)) {
    cart.items = [];
    cart.subtotalCents = 0;
  }

  recalc(cart);
  await cart.save();
  return cart.toJSON();
}
