// =================================================================
// ARCHIVO DE SERVICIO DEL CARRITO (El Gerente del Supermercado 🛒)
// =================================================================

import { CartModel } from './model';
import { ProductModel } from '../products/model';

// --- 2. CONFIGURACIÓN Y REGLAS DE LA TIENDA ---
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 horas en milisegundos para la expiración del carrito.
const H2 = 2 * 60 * 60 * 1000;          // 2 horas en milisegundos para congelar precios.
const nowMs = () => Date.now();


// --- 3. FUNCIONES AYUDANTES ("AYUDANTES DE COCINA") ---

/** Pequeña fábrica para crear errores HTTP de forma consistente. */
function httpError(message: string, status = 400) {
  const e: any = new Error(message);
  e.status = status;
  return e;
}

/** Revisa si un carrito ha estado inactivo por más de 24 horas. */
function isExpired(cart: any): boolean {
  const updatedAt = cart?.updatedAt;
  const lastUpdatedMs = updatedAt instanceof Date ? updatedAt.getTime() : typeof updatedAt === 'string' ? Date.parse(updatedAt) : 0;
  return lastUpdatedMs ? (nowMs() - lastUpdatedMs) > ONE_DAY_MS : false;
}

/** Busca un producto y se asegura de que esté disponible. */
async function getProductOrThrow(productId: string) {
  const product = await ProductModel.findById(productId).lean();
  if (!product) {
    throw httpError('PRODUCT_NOT_FOUND', 404);
  }
  if (product.status !== 'active') {
    throw httpError('PRODUCT_NOT_AVAILABLE', 409);
  }
  return product;
}

/** La política de "congelación de precios" de 2 horas. */
function resolvePriceLock(prod: any, existing?: any) {
  const lockDate = existing?.priceLockUntil ? new Date(existing.priceLockUntil) : undefined;
  const lockStillValid = lockDate && nowMs() < lockDate.getTime();

  if (lockStillValid) {
    return { unitPriceCents: existing.unitPriceCents, priceLockUntil: lockDate };
  }
  return {
    unitPriceCents: prod.priceCents,
    priceLockUntil: new Date(nowMs() + H2),
  };
}

// --- FUNCIÓN INTERNA CLAVE ---
/**
 * Busca o crea el carrito activo de un usuario.
 * DEVUELVE EL DOCUMENTO COMPLETO DE MONGOOSE (el "documento inteligente" con .save()).
 * Esta es la función que deben usar las demás lógicas del servicio.
 */
async function _getOrCreateActiveCart(userId: string) {
  if (!userId) throw httpError('USER_ID_REQUIRED', 400);

  let cart = await CartModel.findOne({ userId, status: 'active' });

  if (!cart) {
    cart = await CartModel.create({ userId, currency: 'COP', items: [] });
  } else if (isExpired(cart)) {
    cart.items = [];
    await cart.save(); // El hook 'pre-save' del schema recalculará los totales.
  }
  
  return cart;
}


// --- 4. RECETAS PRINCIPALES (LÓGICA DE NEGOCIO PÚBLICA) ---

/**
 * Obtiene el carrito activo de un usuario para ENVIARLO AL CLIENTE.
 * Usa la función interna y convierte el resultado a JSON.
 */
export async function getMyCart(userId: string) {
  const cartDocument = await _getOrCreateActiveCart(userId);
  return cartDocument.toJSON();
}

/**
 * Añade un producto al carrito o incrementa su cantidad si ya existe.
 */
export async function addItem(params: { userId: string; productId: string; quantity: number }) {
  const { userId, productId, quantity } = params;

  // 1. Obtenemos el "documento inteligente" del carrito, con el que sí podemos trabajar.
  const cart = await _getOrCreateActiveCart(userId);

  // 2. Buscamos el producto y validamos la moneda.
  const prod = await getProductOrThrow(productId);
  if (cart.currency !== prod.currency) {
    throw httpError('CURRENCY_MISMATCH', 409);
  }
  
  // 3. Revisa si el producto ya estaba en el carrito.
  const existing = cart.items.find((i: any) => i.productId === productId);

  // 4. Aplicamos la política de congelación de precios.
  const { unitPriceCents, priceLockUntil } = resolvePriceLock(prod, existing);

  // 5. Validamos si hay suficiente stock.
  const desiredQty = (existing?.quantity ?? 0) + quantity;
  if (desiredQty > prod.stock) {
    throw httpError(`INSUFFICIENT_STOCK_${prod.stock}`, 409);
  }

  // 6. Actualizamos el item existente o añadimos uno nuevo.
  if (existing) {
    Object.assign(existing, {
      quantity: desiredQty, unitPriceCents, priceLockUntil,
      sku: prod.sku, name: prod.name, image: prod.images?.[0] ?? existing.image,
    });
  } else {
    cart.items.push({
      productId, quantity, unitPriceCents, priceLockUntil,
      sku: prod.sku, name: prod.name, image: prod.images?.[0], totalCents: 0,
    });
  }

  // 7. Guardamos los cambios. El schema se encargará de recalcular los totales.
  await cart.save();
  return cart.toJSON(); // Convertimos a JSON solo al final para la respuesta.
}

/**
 * Cambia la cantidad de un producto específico en el carrito.
 */
export async function setItemQuantity(params: { userId: string; productId: string; quantity: number }) {
  const { userId, productId, quantity } = params;

  // 1. Obtenemos el "documento inteligente" del carrito.
  const cart = await _getOrCreateActiveCart(userId);
  
  // 2. Buscamos el item específico dentro del carrito.
  const item = cart.items.find((i: any) => i.productId === productId);
  if (!item) throw httpError('ITEM_NOT_IN_CART', 404);

  // 3. Validamos el stock para la nueva cantidad.
  const prod = await getProductOrThrow(productId);
  if (quantity > prod.stock) {
    throw httpError(`INSUFFICIENT_STOCK_${prod.stock}`, 409);
  }

  // 4. Aplicamos la política de congelación de precios.
  const { unitPriceCents, priceLockUntil } = resolvePriceLock(prod, item);

  // 5. Actualizamos la cantidad y los datos del precio.
  Object.assign(item, { quantity, unitPriceCents, priceLockUntil });
 
  // 6. Guardamos los cambios.
  await cart.save();
  return cart.toJSON();
}

/**
 * Elimina un producto del carrito.
 */
export async function removeItem(params: { userId: string; productId: string }) {
  const { userId, productId } = params;

  // 1. Obtenemos el "documento inteligente" del carrito.
  const cart = await _getOrCreateActiveCart(userId);

  // 2. Eliminamos el item de la lista.
  const originalLength = cart.items.length;
  cart.items = cart.items.filter((i: any) => i.productId !== productId);

  if (cart.items.length === originalLength) {
    throw httpError('ITEM_NOT_IN_CART', 404);
  }

  // 3. Guardamos los cambios.
  await cart.save();
  return cart.toJSON();
}