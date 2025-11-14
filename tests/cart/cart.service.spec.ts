import { connect, close, clear } from '../setupMongo';
import * as CartSvc from '../../src/domain/services/shippingCartService';
import { ensureCustomerBase, createProduct } from '../factories';

beforeAll(async () => { await connect(); });
afterAll(close);
afterEach(clear);

describe('Cart Service', () => {
  test('addItem crea cart si no existe, suma cantidades y recalcula', async () => {
    await ensureCustomerBase({ _id:'U1' });
    const p1 = await createProduct({ priceCents: 1500, stock: 10 });      

    const c1 = await CartSvc.addItem({ userId:'U1', productId: p1.id, quantity: 2 });  
    expect(c1.items.length).toBe(1);
    expect(c1.subtotalCents).toBe(3000);

    const c2 = await CartSvc.addItem({ userId:'U1', productId: p1.id, quantity: 3 });  
    const it = c2.items.find(i => i.productId === p1.id)!;                            
    expect(it.quantity).toBe(5);
    expect(c2.subtotalCents).toBe(7500);
  });

  test('addItem rechaza stock insuficiente y moneda distinta', async () => {
    await ensureCustomerBase({ _id:'U2' });
    const p2 = await createProduct({ priceCents: 1000, stock: 2, currency:'COP' });    
    const p3 = await createProduct({ priceCents: 1000, stock: 5, currency:'USD' });

    await CartSvc.addItem({ userId:'U2', productId: p2.id, quantity: 2 });            
    await expect(CartSvc.addItem({ userId:'U2', productId: p2.id, quantity: 1 }))     
      .rejects.toThrow(/INSUFFICIENT_STOCK/i);

    await expect(CartSvc.addItem({ userId:'U2', productId: p3.id, quantity: 1 }))    
      .rejects.toThrow(/CURRENCY_MISMATCH/i);
  });

  test('setItemQuantity setea exacto y respeta precio congelado', async () => {
    await ensureCustomerBase({ _id:'U3' });
    const p4 = await createProduct({ priceCents: 2000, stock: 10 });

    const c1 = await CartSvc.addItem({ userId:'U3', productId: p4.id, quantity: 1 }); 
    const before = c1.items.find(i => i.productId === p4.id)!;                        
    expect(before.unitPriceCents).toBe(2000);

    const c2 = await CartSvc.setItemQuantity({ userId:'U3', productId: p4.id, quantity: 4 }); 
    const after = c2.items.find(i => i.productId === p4.id)!;
    expect(after.quantity).toBe(4);
    expect(c2.subtotalCents).toBe(4 * after.unitPriceCents);
  });

  test('removeItem elimina item del carrito', async () => {
    await ensureCustomerBase({ _id:'U4' });
    const p5 = await createProduct({ priceCents: 1000, stock: 5 });

    await CartSvc.addItem({ userId:'U4', productId: p5.id, quantity: 3 });           
    const c1 = await CartSvc.getMyCart('U4');
    expect(c1.items.length).toBe(1);

    const c2 = await CartSvc.removeItem({ userId:'U4', productId: p5.id });         
    expect(c2.items.length).toBe(0);
    expect(c2.subtotalCents).toBe(0);
  });
});
