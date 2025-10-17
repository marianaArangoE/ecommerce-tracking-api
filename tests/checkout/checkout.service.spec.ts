// tests/checkout/checkout.service.spec.ts
import { connect, close, clear } from '../setupMongo';
import * as CartSvc from '../../src/domain/models/shippingCart/service';
import * as CheckoutSvc from '../../src/domain/models/checkout/service';
import { ensureCustomerBase, createProduct } from '../factories';

beforeAll(async () => { await connect(); });
afterAll(close);
afterEach(clear);

describe('Checkout Service', () => {
  test('createCheckout: valida dirección, arma snapshot, calcula shipping y grand total', async () => {
    await ensureCustomerBase({ _id:'U1' });
    const p = await createProduct({ priceCents: 10000, stock: 5, weight: 2 });

    await CartSvc.addItem({ userId:'U1', productId: p.id, quantity: 2 }); // subtotal 20000
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U1',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'card',
    });

    expect(chk.id).toBeDefined();
    expect(chk.items.length).toBe(1);
    expect(chk.subtotalCents).toBe(20000);
    expect(chk.shippingCents).toBeGreaterThanOrEqual(0);
    expect(chk.grandTotalCents).toBe(chk.subtotalCents + chk.shippingCents);
    expect(chk.status).toBe('pending');
    // snapshot de la address
    expect(chk.addressSnapshot?.id).toBe('ADDR1');
    expect(chk.addressSnapshot?.city).toBeTruthy();
  });

  test('createCheckout: falla si la address no existe en el usuario', async () => {
    await ensureCustomerBase({ _id:'U2', addresses: [] });
    const p = await createProduct({ priceCents: 1000, stock: 5 });

    await CartSvc.addItem({ userId:'U2', productId: p.id, quantity: 1 });

    await expect(
      CheckoutSvc.createCheckout({
        userId: 'U2',
        addressId: 'NOPE',
        shippingMethod: 'standard',
        paymentMethod: 'card',
      })
    ).rejects.toThrow(/Dirección no encontrada/i);
  });

  test('createCheckout: envío gratis cuando subtotal >= 50000', async () => {
    await ensureCustomerBase({ _id:'U3' });
    const p = await createProduct({ priceCents: 30000, stock: 10, weight: 1 });

    // 30k x 2 = 60k ⇒ debería aplicar envío gratis según tu regla
    await CartSvc.addItem({ userId:'U3', productId: p.id, quantity: 2 });

    const chk = await CheckoutSvc.createCheckout({
      userId: 'U3',
      addressId: 'ADDR1',
      shippingMethod: 'express',      // aunque sea express, al ser >=50k debe quedar 0
      paymentMethod: 'card',
    });

    expect(chk.subtotalCents).toBe(60000);
    expect(chk.shippingCents).toBe(0);
    expect(chk.grandTotalCents).toBe(60000);
  });
});
