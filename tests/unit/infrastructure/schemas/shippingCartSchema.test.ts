import mongoose from 'mongoose';
import { CartSchema, CartItemSchema } from '../../../../src/infrastructure/schemas/shippingCartSchema';

describe('ShippingCartSchema', () => {
  let CartModel: mongoose.Model<any>;

  beforeAll(() => {
    if (mongoose.models.Cart) {
      delete mongoose.models.Cart;
    }
    CartModel = mongoose.model('Cart', CartSchema);
  });

  afterEach(async () => {
    await CartModel.deleteMany({});
  });

  describe('CartItemSchema', () => {
    it('debería validar item con datos válidos', async () => {
      const item = {
        productId: 'prod123',
        sku: 'SKU12345',
        name: 'Product Name',
        quantity: 2,
        unitPriceCents: 1000,
        totalCents: 2000,
      };

      const cart = new CartModel({
        userId: 'user123',
        currency: 'COP',
        items: [item],
      });

      await expect(cart.validate()).resolves.not.toThrow();
    });

    it('debería fallar si quantity es menor a 1', async () => {
      const item = {
        productId: 'prod123',
        sku: 'SKU12345',
        name: 'Product Name',
        quantity: 0,
        unitPriceCents: 1000,
      };

      const cart = new CartModel({
        userId: 'user123',
        currency: 'COP',
        items: [item],
      });

      await expect(cart.validate()).rejects.toThrow();
    });

    it('debería fallar si quantity es mayor a 999', async () => {
      const item = {
        productId: 'prod123',
        sku: 'SKU12345',
        name: 'Product Name',
        quantity: 1000,
        unitPriceCents: 1000,
      };

      const cart = new CartModel({
        userId: 'user123',
        currency: 'COP',
        items: [item],
      });

      await expect(cart.validate()).rejects.toThrow();
    });

    it('debería fallar si unitPriceCents es negativo', async () => {
      const item = {
        productId: 'prod123',
        sku: 'SKU12345',
        name: 'Product Name',
        quantity: 1,
        unitPriceCents: -100,
      };

      const cart = new CartModel({
        userId: 'user123',
        currency: 'COP',
        items: [item],
      });

      await expect(cart.validate()).rejects.toThrow();
    });

    it('debería permitir priceLockUntil como Date', async () => {
      const item = {
        productId: 'prod123',
        sku: 'SKU12345',
        name: 'Product Name',
        quantity: 1,
        unitPriceCents: 1000,
        priceLockUntil: new Date(),
      };

      const cart = new CartModel({
        userId: 'user123',
        currency: 'COP',
        items: [item],
      });

      await expect(cart.validate()).resolves.not.toThrow();
    });
  });

  describe('CartSchema', () => {
    it('debería crear carrito con datos válidos', async () => {
      const cart = new CartModel({
        userId: 'user123',
        currency: 'COP',
        status: 'active',
        items: [],
        subtotalCents: 0,
      });

      await expect(cart.validate()).resolves.not.toThrow();
      expect(cart.userId).toBe('user123');
      expect(cart.currency).toBe('COP');
    });

    it('debería usar valores por defecto', async () => {
      const cart = new CartModel({
        userId: 'user123',
      });

      await expect(cart.validate()).resolves.not.toThrow();
      expect(cart.currency).toBe('COP');
      expect(cart.status).toBe('active');
      expect(cart.items).toEqual([]);
      expect(cart.subtotalCents).toBe(0);
    });

    it('debería fallar con currency inválida', async () => {
      const cart = new CartModel({
        userId: 'user123',
        currency: 'INVALID',
      });

      await expect(cart.validate()).rejects.toThrow();
    });

    it('debería fallar con status inválido', async () => {
      const cart = new CartModel({
        userId: 'user123',
        status: 'invalid',
      });

      await expect(cart.validate()).rejects.toThrow();
    });

    it('debería fallar si userId está vacío', async () => {
      const cart = new CartModel({
        userId: '',
      });

      await expect(cart.validate()).rejects.toThrow();
    });

    it('debería calcular totales automáticamente en pre-validate', async () => {
      const cart = new CartModel({
        userId: 'user123',
        items: [
          {
            productId: 'prod1',
            sku: 'SKU1',
            name: 'Product 1',
            quantity: 2,
            unitPriceCents: 1000,
            totalCents: 0,
          },
          {
            productId: 'prod2',
            sku: 'SKU2',
            name: 'Product 2',
            quantity: 3,
            unitPriceCents: 500,
            totalCents: 0,
          },
        ],
      });

      await cart.validate();
      expect(cart.items[0].totalCents).toBe(2000);
      expect(cart.items[1].totalCents).toBe(1500);
      expect(cart.subtotalCents).toBe(3500);
    });

    it('debería calcular totales automáticamente en pre-save', async () => {
      const cart = new CartModel({
        userId: 'user123',
        items: [
          {
            productId: 'prod1',
            sku: 'SKU1',
            name: 'Product 1',
            quantity: 2,
            unitPriceCents: 1000,
            totalCents: 0,
          },
        ],
      });

      await cart.save();
      expect(cart.items[0].totalCents).toBe(2000);
      expect(cart.subtotalCents).toBe(2000);
    });

    it('debería manejar valores negativos en cálculo', async () => {
      const cart = new CartModel({
        userId: 'user123',
        items: [
          {
            productId: 'prod1',
            sku: 'SKU1',
            name: 'Product 1',
            quantity: -1,
            unitPriceCents: 1000,
            totalCents: 0,
          },
        ],
      });

      await cart.validate();
      expect(cart.items[0].totalCents).toBe(0);
      expect(cart.subtotalCents).toBe(0);
    });

    it('debería tener virtual id', async () => {
      const cart = new CartModel({
        userId: 'user123',
      });
      await cart.save();

      expect(cart.id).toBeDefined();
      expect(typeof cart.id).toBe('string');
    });

    it('debería transformar fechas a ISO en toJSON', async () => {
      const cart = new CartModel({
        userId: 'user123',
      });
      await cart.save();

      const json = cart.toJSON();
      expect(typeof json.createdAt).toBe('string');
      expect(typeof json.updatedAt).toBe('string');
      expect(json.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('debería transformar fechas a ISO en toObject', async () => {
      const cart = new CartModel({
        userId: 'user123',
      });
      await cart.save();

      const obj = cart.toObject();
      expect(typeof obj.createdAt).toBe('string');
      expect(typeof obj.updatedAt).toBe('string');
    });

    it('debería tener índice único para userId y status active', async () => {
      const cart1 = new CartModel({
        userId: 'user123',
        status: 'active',
      });
      await cart1.save();

      const cart2 = new CartModel({
        userId: 'user123',
        status: 'active',
      });

      await expect(cart2.save()).rejects.toThrow();
    });

    it('debería permitir múltiples carritos closed para el mismo usuario', async () => {
      const cart1 = new CartModel({
        userId: 'user123',
        status: 'closed',
      });
      await cart1.save();

      const cart2 = new CartModel({
        userId: 'user123',
        status: 'closed',
      });
      await expect(cart2.save()).resolves.not.toThrow();
    });
  });
});
