// tests/orders/orders.service.spec.ts
import { connect, close, clear } from '../setupMongo';
import * as CheckoutSvc from '../../src/domain/models/checkout/service';
import * as OrdersSvc from '../../src/domain/models/orders/service';
import * as CartSvc from '../../src/domain/models/shippingCart/service';
import { ensureCustomerBase, createProduct } from '../factories';
import { OrderModel } from '../../src/domain/models/orders/model';

// 🧪 Mock de servicios externos que usa OrdersSvc
jest.mock('../../src/domain/services/services', () => ({
  verifyAndReserve: jest.fn().mockResolvedValue(true),
  genOrderId: jest.fn().mockReturnValue('ORD-UT-1'),
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  nowISO: () => new Date().toISOString(),
  returnStock: jest.fn().mockResolvedValue(true),
}));

const SvcMocks = require('../../src/domain/services/services');

beforeAll(async () => {
  await connect();
});
afterAll(close);
afterEach(async () => {
  jest.clearAllMocks();
  await clear();
});

describe('Orders Service', () => {
  test('confirmOrder: crea PENDIENTE e idempotencia por checkoutId', async () => {
    await ensureCustomerBase({ _id: 'U1' });
    const p = await createProduct({ priceCents: 1500, stock: 10 });

    // carrito + checkout
    await CartSvc.addItem({ userId: 'U1', productId: p.id, quantity: 2 });
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U1',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'card',
    });

    // primer confirm
    const a = await OrdersSvc.confirmOrder({ userId: 'U1', checkoutId: chk.id, email: 'c@demo.com' });
    expect(a.status).toBe('PENDIENTE');
    expect(a.orderId).toBe('ORD-UT-1');
    expect(SvcMocks.verifyAndReserve).toHaveBeenCalledTimes(1);
    expect(SvcMocks.sendOrderConfirmation).toHaveBeenCalledTimes(1);

    // idempotencia (mismo checkout → misma orden)
    const b = await OrdersSvc.confirmOrder({ userId: 'U1', checkoutId: chk.id, email: 'c@demo.com' });
    expect(b.orderId).toBe(a.orderId);
    expect(SvcMocks.verifyAndReserve).toHaveBeenCalledTimes(1); // no vuelve a reservar
  });

  test('advanceOrderStatus: PENDIENTE → PROCESANDO → COMPLETADA', async () => {
    await ensureCustomerBase({ _id: 'U2' });
    const p = await createProduct({ priceCents: 1000, stock: 5 });

    await CartSvc.addItem({ userId: 'U2', productId: p.id, quantity: 1 });
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U2',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'card',
    });
    const ord = await OrdersSvc.confirmOrder({ userId: 'U2', checkoutId: chk.id, email: 'c@demo.com' });

    const p1 = await OrdersSvc.advanceOrderStatus(ord.orderId, 'PROCESANDO');
    expect(p1.status).toBe('PROCESANDO');

    const p2 = await OrdersSvc.advanceOrderStatus(ord.orderId, 'COMPLETADA');
    expect(p2.status).toBe('COMPLETADA');
  });

  test('cancelOrder: customer puede cancelar solo su orden PENDIENTE; forbids otras', async () => {
    await ensureCustomerBase({ _id: 'U3' });
    const p = await createProduct({ priceCents: 1000, stock: 5 });

    await CartSvc.addItem({ userId: 'U3', productId: p.id, quantity: 1 });
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U3',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'card',
    });
    const ord = await OrdersSvc.confirmOrder({ userId: 'U3', checkoutId: chk.id, email: 'c@demo.com' });

    // cancela su propia orden
    const ok = await OrdersSvc.cancelOrder(ord.orderId, { role: 'customer', userId: 'U3', reason: 'me arrepentí' });
    expect(ok.ok).toBe(true);
    expect(SvcMocks.returnStock).toHaveBeenCalledTimes(1);

    // crear otra orden de otro usuario (pendiente)
    await OrderModel.create({
      userId: 'OTHER',
      orderId: 'ORD-OTHER',
      checkoutId: 'CK-X',
      items: [],
      totalCents: 1000,
      currency: 'COP',
      status: 'PENDIENTE',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // U3 NO puede cancelar la de OTHER
    await expect(
      OrdersSvc.cancelOrder('ORD-OTHER', { role: 'customer', userId: 'U3' })
    ).rejects.toThrow(/FORBIDDEN/);
  });
});
