import { CartModel } from './model';
import { ProductModel } from '../products/productModel';
//expiracion del carrito en 24h
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
//congelar el precio 2h
const H2  =  2 * 60 * 60 * 1000;  

const nowMs = () => Date.now();

//totales
function recalc(cart: any) {
  let subtotal = 0;

  for (const item of cart.items) {
    // Calcula el total del ítem, lo redondea
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPriceCents) || 0;

    // no negativos 
    item.totalCents = Math.max(0, Math.round(quantity * unitPrice));

    subtotal += item.totalCents;
  }

  // Establece el subtotal del carrito (en centavos, redondeado)
  cart.subtotalCents = Math.max(0, Math.round(subtotal));
}

//expira en 24 horas 
function isExpired(cart: any): boolean {
  const updatedAt = cart?.updatedAt;
  const lastUpdatedMs =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === 'string'
      ? Date.parse(updatedAt)
      : 0;

  return lastUpdatedMs ? (nowMs() - lastUpdatedMs) > ONE_DAY_MS : false;
}
//buscar producto 
async function getProductOrThrow(productId: string) {
  const product = await ProductModel.findById(productId).lean();
 if (!product) {
    const error: any = new Error('PRODUCT_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  if (product.status !== 'active') {
    const error: any = new Error('PRODUCT_NOT_AVAILABLE');
    error.status = 409;
    throw error;
  }
  return product;
}

//respetar precio bloqueado 2h
function resolvePriceLock(prod: any, existing?: any) {
  const lockDate = existing?.priceLockUntil
    ? existing.priceLockUntil instanceof Date
      ? existing.priceLockUntil
      : new Date(existing.priceLockUntil)
    : undefined;

  const lockStillValid = lockDate && nowMs() < lockDate.getTime();

  if (lockStillValid) {
    // Mantener el precio anterior dentro del periodo de bloqueo
    return { unitPriceCents: existing.unitPriceCents, priceLockUntil: lockDate };
  }

  // Si el bloqueo no existe o expiró, crear uno nuevo por 2 horas
  return {
    unitPriceCents: prod.priceCents,
    priceLockUntil: new Date(nowMs() + H2),
  };
}
/** Busca o crea carrito (expira a las 24h) */
export async function getOrCreateCart(userId: string, currency = 'COP') {
  if (!userId) throw Object.assign(new Error('USER_ID_REQUIRED'), { status: 400 });

//carrito activo
  let cart = await CartModel.findOne({ userId });

//si no existe, crear uno nuevo
  if (!cart) {
    cart = await CartModel.create({ userId, currency, items: [] });
    return cart.toJSON();
  }

//si expiró, vaciarlo
  if (isExpired(cart)) {
    Object.assign(cart, { items: [], subtotalCents: 0 });
    recalc(cart);
    await cart.save(); 
  }

  return cart.toJSON();
}

//agregar ítems
export async function addItem(params: { userId: string; productId: string; quantity: number }) {
  const { userId, productId } = params;
  const qty = Number(params.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
    throw httpError('INVALID_QUANTITY_1_999', 400);
  }
//obtener o crear
  let cart: any = await CartModel.findOne({ userId });
  if (!cart) {
    cart = await CartModel.create({ userId, currency: 'COP', items: [] });
  }

//revisar expiracion de 24h
  if (isExpired(cart)) {
    Object.assign(cart, { items: [], subtotalCents: 0 });
  }

//
  const prod = await getProductOrThrow(productId);
  if (cart.currency !== prod.currency) {
    throw httpError('CURRENCY_MISMATCH', 409);
  }
  //evitar agregar si esta duplicado el producto
  const existing = cart.items.find((i: any) => i.productId === productId);
//tenia precio congelado?
  const { unitPriceCents, priceLockUntil } = resolvePriceLock(prod, existing);

//stock
  const desiredQty = (existing?.quantity ?? 0) + qty;
  if (desiredQty > prod.stock) {
    throw httpError(`INSUFFICIENT_STOCK_${prod.stock}`, 409);
  }


  if (existing) {
    Object.assign(existing, {
      quantity: desiredQty,
      unitPriceCents,
      priceLockUntil,
      sku: prod.sku,
      name: prod.name,
      image: prod.images?.[0] ?? existing.image,
    });
  } else {
    cart.items.push({
      productId,
      sku: prod.sku,
      name: prod.name,
      image: prod.images?.[0],
      quantity: qty,
      unitPriceCents,
      totalCents: 0,      
      priceLockUntil,   
    });
  }

  // Recalcular totales y guardar
  recalc(cart);
  await cart.save();
  return cart.toJSON();
}
// errores http
function httpError(message: string, status = 400) {
  const e: any = new Error(message);
  e.status = status;
  return e;
}

//actualizar cantidad
export async function setItemQuantity(params: { userId: string; productId: string; quantity: number }) {
  const { userId, productId } = params;

//validar cantidad
  const qty = Number(params.quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
    throw httpError('INVALID_QUANTITY_1_999', 400);
  }

//buscar el carrito del usuario
  const cart: any = await CartModel.findOne({ userId });
  if (!cart) throw httpError('CART_NOT_FOUND', 404);

//inactividad o expiracion
  if (isExpired(cart)) {
    Object.assign(cart, { items: [], subtotalCents: 0 });
    recalc(cart);
    await cart.save();
    throw httpError('CART_EXPIRED', 409);
  }
  //buscar item
  const item = cart.items.find((i: any) => i.productId === productId);
  if (!item) throw httpError('ITEM_NOT_IN_CART', 404);

//verificar stock
  const prod = await getProductOrThrow(productId);
  if (qty > prod.stock) {
    throw httpError(`INSUFFICIENT_STOCK_${prod.stock}`, 409);
  }

//esta congelado el precio?
  const { unitPriceCents, priceLockUntil } = resolvePriceLock(prod, item);

//actualizar cantidad y precio
  Object.assign(item, {
    quantity: qty,
    unitPriceCents,
    priceLockUntil
  });

 
  recalc(cart);
  await cart.save();
  return cart.toJSON();
}
//eliminar item
export async function removeItem(params: { userId: string; productId: string }) {
  const { userId, productId } = params;


  const cart: any = await CartModel.findOne({ userId });
  if (!cart) {
    const e: any = new Error('CART_NOT_FOUND');
    e.status = 404;
    throw e;
  }


  const idx = cart.items.findIndex((i: any) => i.productId === productId);
  if (idx === -1) {
    const e: any = new Error('ITEM_NOT_IN_CART');
    e.status = 404;
    throw e;
  }


  cart.items.splice(idx, 1);
  recalc(cart);
  await cart.save();
  return cart.toJSON();
}

//ver mi carrito
export async function getMyCart(userId: string) {
//busca o crea
  let cart: any = await CartModel.findOne({ userId });
  if (!cart) {
    cart = await CartModel.create({ userId, currency: 'COP', items: [] });
    return cart.toJSON();
  }

//si expiró, vaciarlo
  if (isExpired(cart)) {
    cart.items = [];
    cart.subtotalCents = 0;
  }

  recalc(cart);
  await cart.save();
  return cart.toJSON();
}
