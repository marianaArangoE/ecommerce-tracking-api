
import { connect, close, clear } from '../setupMongo';
import * as CartSvc from '../../src/domain/models/shippingCart/service';
import * as CheckoutSvc from '../../src/domain/models/checkout/service';
import * as OrdersSvc from '../../src/domain/models/orders/service';
import * as PaySvc from '../../src/domain/models/payments/services';
import { ensureCustomerBase, createProduct } from '../factories';
import { PaymentIntentModel } from '../../src/domain/models/payments/model';
import { OrderModel } from '../../src/domain/models/orders/model';


jest.mock('../../src/domain/services/services', () => ({
  verifyAndReserve: jest.fn().mockResolvedValue(true),
  genOrderId: jest.fn().mockReturnValue('ORD-UT-PAY'),
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  nowISO: () => new Date().toISOString(),
  returnStock: jest.fn().mockResolvedValue(true),
}));

beforeAll(async () => { await connect(); });
afterAll(close);
afterEach(async () => { await clear(); jest.clearAllMocks(); });

describe('Payments Service', () => {
  test('createPaymentIntent (card) es idempotente por {orderId,userId}', async () => {
    await ensureCustomerBase({ _id: 'U1' });
    const p = await createProduct({ priceCents: 5000, stock: 5 });

    await CartSvc.addItem({ userId: 'U1', productId: p.id, quantity: 1 });
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U1',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'card',
    });
    const ord = await OrdersSvc.confirmOrder({ userId: 'U1', checkoutId: chk.id, email: 'c@demo.com' });

    const a = await PaySvc.createPaymentIntent({ userId: 'U1', orderId: ord.orderId, method: 'card', provider: 'VISA' });
    const b = await PaySvc.createPaymentIntent({ userId: 'U1', orderId: ord.orderId, method: 'card', provider: 'VISA' });

    expect(a._id).toBeDefined();
    expect(a.status).toBe('requires_confirmation');
    expect(b._id).toEqual(a._id); // idempotente
  });

  test('confirmCardPayment (success) → intent:succeeded y orden PROCESANDO/paid', async () => {
    await ensureCustomerBase({ _id: 'U2' });
    const p = await createProduct({ priceCents: 7000, stock: 5 });

    await CartSvc.addItem({ userId: 'U2', productId: p.id, quantity: 1 });
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U2',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'card',
    });
    const ord = await OrdersSvc.confirmOrder({ userId: 'U2', checkoutId: chk.id, email: 'c@demo.com' });

    const intent = await PaySvc.createPaymentIntent({ userId: 'U2', orderId: ord.orderId, method: 'card', provider: 'VISA' });
    const confirmed = await PaySvc.confirmCardPayment('U2', intent.id, true);

    expect(confirmed.status).toBe('succeeded');

    const updated = await OrderModel.findOne({ orderId: ord.orderId }).lean();
    expect(updated?.paymentStatus).toBe('paid');
    expect(updated?.status).toBe('PROCESANDO');
  });

  test('confirmCardPayment (fail) → intent:failed y orden paymentStatus=failed, status sigue PENDIENTE', async () => {
    await ensureCustomerBase({ _id: 'U3' });
    const p = await createProduct({ priceCents: 8000, stock: 5 });

    await CartSvc.addItem({ userId: 'U3', productId: p.id, quantity: 1 });
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U3',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'card',
    });
    const ord = await OrdersSvc.confirmOrder({ userId: 'U3', checkoutId: chk.id, email: 'c@demo.com' });

    const intent = await PaySvc.createPaymentIntent({ userId: 'U3', orderId: ord.orderId, method: 'card', provider: 'VISA' });
    const failed = await PaySvc.confirmCardPayment('U3', intent.id, false);

    expect(failed.status).toBe('failed');

    const updated = await OrderModel.findOne({ orderId: ord.orderId }).lean();
    expect(updated?.paymentStatus).toBe('failed');
    expect(updated?.status).toBe('PENDIENTE');
  });

  test('transfer: admin confirma → intent:succeeded y orden PROCESANDO/paid', async () => {
    await ensureCustomerBase({ _id: 'U4' });
    const p = await createProduct({ priceCents: 6000, stock: 5 });

    await CartSvc.addItem({ userId: 'U4', productId: p.id, quantity: 1 });
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U4',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'transfer',
    });
    const ord = await OrdersSvc.confirmOrder({ userId: 'U4', checkoutId: chk.id, email: 'c@demo.com' });

    const intent = await PaySvc.createPaymentIntent({ userId: 'U4', orderId: ord.orderId, method: 'transfer', provider: 'BANCO_X' });
    expect(intent.status).toBe('pending');

    const ok = await PaySvc.adminConfirmTransfer(ord.orderId);
    expect(ok.ok).toBe(true);

    const up = await OrderModel.findOne({ orderId: ord.orderId }).lean();
    expect(up?.paymentStatus).toBe('paid');
    expect(up?.status).toBe('PROCESANDO');

    const pi = await PaymentIntentModel.findOne({ orderId: ord.orderId, method: 'transfer' }).lean();
    expect(pi?.status).toBe('succeeded');
  });

  test('COD: admin marca pagado → intent:succeeded y orden PROCESANDO/paid', async () => {
    await ensureCustomerBase({ _id: 'U5' });
    const p = await createProduct({ priceCents: 9000, stock: 5 });

    await CartSvc.addItem({ userId: 'U5', productId: p.id, quantity: 1 });
    const chk = await CheckoutSvc.createCheckout({
      userId: 'U5',
      addressId: 'ADDR1',
      shippingMethod: 'standard',
      paymentMethod: 'cod',
    });
    const ord = await OrdersSvc.confirmOrder({ userId: 'U5', checkoutId: chk.id, email: 'c@demo.com' });

    await PaymentIntentModel.create({
      userId: 'U5',
      orderId: ord.orderId,
      amountCents: ord.totalCents,
      currency: ord.currency,
      method: 'cod',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const ok = await PaySvc.adminMarkCodPaid(ord.orderId);
    expect(ok.ok).toBe(true);

    const up = await OrderModel.findOne({ orderId: ord.orderId }).lean();
    expect(up?.paymentStatus).toBe('paid');
    expect(up?.status).toBe('PROCESANDO');

    const pi = await PaymentIntentModel.findOne({ orderId: ord.orderId, method: 'cod' }).lean();
    expect(pi?.status).toBe('succeeded');
  });
});
