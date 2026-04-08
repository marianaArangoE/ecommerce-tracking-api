import * as CartService from '../../../../src/domain/services/shippingCartService';
import { CartModel } from '../../../../src/domain/models/shippingCart/shippingCartModel';
import { ProductModel } from '../../../../src/domain/models/products/productModel';

jest.mock('../../../../src/domain/models/shippingCart/shippingCartModel');
jest.mock('../../../../src/domain/models/products/productModel');

describe('ShippingCartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyCart', () => {
    it('debería obtener carrito existente', async () => {
      const mockCart = {
        userId: 'user123',
        items: [],
        subtotalCents: 0,
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ userId: 'user123', items: [], subtotalCents: 0 }),
      };
      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      const result = await CartService.getMyCart('user123');

      expect(result).toBeDefined();
      expect(CartModel.findOne).toHaveBeenCalledWith({ userId: 'user123' });
    });

    it('debería crear carrito si no existe', async () => {
      (CartModel.findOne as jest.Mock).mockResolvedValue(null);
      const mockNewCart = {
        userId: 'user123',
        items: [],
        subtotalCents: 0,
        toJSON: jest.fn().mockReturnValue({ userId: 'user123', items: [] }),
      };
      (CartModel.create as jest.Mock).mockResolvedValue(mockNewCart);

      const result = await CartService.getMyCart('user123');

      expect(CartModel.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('addItem', () => {
    it('debería agregar item al carrito', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        priceCents: 1000,
        stock: 10,
        status: 'active',
        sku: 'SKU1',
        currency: 'COP',
        images: ['img1.jpg'],
      };
      const mockCart = {
        userId: 'user123',
        items: [],
        subtotalCents: 0,
        currency: 'COP',
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ userId: 'user123', items: [] }),
      };

      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });
      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      const result = await CartService.addItem({
        userId: 'user123',
        productId: 'prod1',
        quantity: 2,
      });

      expect(result).toBeDefined();
      expect(mockCart.save).toHaveBeenCalled();
    });

    it('debería crear carrito si no existe', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        priceCents: 1000,
        stock: 10,
        status: 'active',
        sku: 'SKU1',
        currency: 'COP',
        images: ['img1.jpg'],
      };
      const mockNewCart = {
        userId: 'user123',
        items: [],
        currency: 'COP',
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ userId: 'user123', items: [] }),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(null);
      (CartModel.create as jest.Mock).mockResolvedValue(mockNewCart);
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await CartService.addItem({
        userId: 'user123',
        productId: 'prod1',
        quantity: 2,
      });

      expect(CartModel.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('debería actualizar item existente en lugar de duplicar', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        priceCents: 1000,
        stock: 10,
        status: 'active',
        sku: 'SKU1',
        currency: 'COP',
        images: ['img1.jpg'],
      };
      const existingItem = { productId: 'prod1', quantity: 2 };
      const mockCart = {
        userId: 'user123',
        items: [existingItem],
        subtotalCents: 2000,
        currency: 'COP',
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ userId: 'user123', items: [existingItem] }),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await CartService.addItem({
        userId: 'user123',
        productId: 'prod1',
        quantity: 3,
      });

      expect(result).toBeDefined();
      expect(mockCart.items.length).toBe(1);
    });

    it('debería fallar con cantidad inválida (menor a 1)', async () => {
      await expect(
        CartService.addItem({
          userId: 'user123',
          productId: 'prod1',
          quantity: 0,
        })
      ).rejects.toThrow('INVALID_QUANTITY_1_999');
    });

    it('debería fallar con cantidad inválida (mayor a 999)', async () => {
      await expect(
        CartService.addItem({
          userId: 'user123',
          productId: 'prod1',
          quantity: 1000,
        })
      ).rejects.toThrow('INVALID_QUANTITY_1_999');
    });

    it('debería fallar si producto no existe', async () => {
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        CartService.addItem({
          userId: 'user123',
          productId: 'prod999',
          quantity: 1,
        })
      ).rejects.toThrow('PRODUCT_NOT_FOUND');
    });

    it('debería fallar si producto no está activo', async () => {
      const mockProduct = {
        _id: 'prod1',
        status: 'inactive',
      };
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });

      await expect(
        CartService.addItem({
          userId: 'user123',
          productId: 'prod1',
          quantity: 1,
        })
      ).rejects.toThrow('PRODUCT_NOT_AVAILABLE');
    });

    it('debería fallar si hay mismatch de moneda', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        priceCents: 1000,
        stock: 10,
        status: 'active',
        currency: 'USD',
      };
      const mockCart = {
        userId: 'user123',
        items: [],
        currency: 'COP',
        updatedAt: new Date(),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });

      await expect(
        CartService.addItem({
          userId: 'user123',
          productId: 'prod1',
          quantity: 1,
        })
      ).rejects.toThrow('CURRENCY_MISMATCH');
    });

    it('debería fallar si stock insuficiente', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        priceCents: 1000,
        stock: 5,
        status: 'active',
        currency: 'COP',
        sku: 'SKU1',
        images: ['img1.jpg'],
      };
      const existingItem = { productId: 'prod1', quantity: 3 };
      const mockCart = {
        userId: 'user123',
        items: [existingItem],
        currency: 'COP',
        updatedAt: new Date(),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });

      await expect(
        CartService.addItem({
          userId: 'user123',
          productId: 'prod1',
          quantity: 5,
        })
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('debería limpiar carrito si está expirado', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        priceCents: 1000,
        stock: 10,
        status: 'active',
        currency: 'COP',
        sku: 'SKU1',
        images: ['img1.jpg'],
      };
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 horas atrás
      const mockCart = {
        userId: 'user123',
        items: [{ productId: 'old-prod', quantity: 1 }],
        currency: 'COP',
        updatedAt: oldDate,
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ userId: 'user123', items: [] }),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });

      const result = await CartService.addItem({
        userId: 'user123',
        productId: 'prod1',
        quantity: 2,
      });

      expect(mockCart.items.length).toBe(1); // Se limpia y luego se agrega el nuevo
      expect(result).toBeDefined();
    });
  });

  describe('setItemQuantity', () => {
    it('debería actualizar cantidad de item', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        priceCents: 1000,
        stock: 10,
        status: 'active',
        sku: 'SKU1',
        image: 'img1.jpg',
      };
      const mockCart = {
        userId: 'user123',
        items: [{ productId: 'prod1', quantity: 2 }],
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ userId: 'user123', items: [] }),
      };
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });
      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      const result = await CartService.setItemQuantity({
        userId: 'user123',
        productId: 'prod1',
        quantity: 5,
      });

      expect(result).toBeDefined();
      expect(mockCart.save).toHaveBeenCalled();
    });

    it('debería fallar con cantidad inválida', async () => {
      await expect(
        CartService.setItemQuantity({
          userId: 'user123',
          productId: 'prod1',
          quantity: 0,
        })
      ).rejects.toThrow('INVALID_QUANTITY_1_999');
    });

    it('debería fallar si carrito no existe', async () => {
      (CartModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CartService.setItemQuantity({
          userId: 'user123',
          productId: 'prod1',
          quantity: 5,
        })
      ).rejects.toThrow('CART_NOT_FOUND');
    });

    it('debería fallar si carrito está expirado', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const mockCart = {
        userId: 'user123',
        items: [],
        updatedAt: oldDate,
        save: jest.fn().mockResolvedValue(true),
      };
      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      await expect(
        CartService.setItemQuantity({
          userId: 'user123',
          productId: 'prod1',
          quantity: 5,
        })
      ).rejects.toThrow('CART_EXPIRED');
    });

    it('debería fallar si item no está en el carrito', async () => {
      const mockCart = {
        userId: 'user123',
        items: [],
        updatedAt: new Date(),
      };
      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      await expect(
        CartService.setItemQuantity({
          userId: 'user123',
          productId: 'prod999',
          quantity: 5,
        })
      ).rejects.toThrow('ITEM_NOT_IN_CART');
    });

    it('debería fallar si stock insuficiente', async () => {
      const mockProduct = {
        _id: 'prod1',
        stock: 5,
        status: 'active',
      };
      const mockCart = {
        userId: 'user123',
        items: [{ productId: 'prod1', quantity: 2 }],
        updatedAt: new Date(),
      };
      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProduct),
      });

      await expect(
        CartService.setItemQuantity({
          userId: 'user123',
          productId: 'prod1',
          quantity: 10,
        })
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });
  });

  describe('removeItem', () => {
    it('debería eliminar item del carrito', async () => {
      const mockCart = {
        userId: 'user123',
        items: [{ productId: 'prod1', quantity: 2 }],
        updatedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ userId: 'user123', items: [] }),
      };
      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      const result = await CartService.removeItem({
        userId: 'user123',
        productId: 'prod1',
      });

      expect(result).toBeDefined();
      expect(mockCart.save).toHaveBeenCalled();
    });

    it('debería fallar si carrito no existe', async () => {
      (CartModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CartService.removeItem({
          userId: 'user123',
          productId: 'prod1',
        })
      ).rejects.toThrow('CART_NOT_FOUND');
    });

    it('debería fallar si item no está en el carrito', async () => {
      const mockCart = {
        userId: 'user123',
        items: [],
        updatedAt: new Date(),
      };
      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      await expect(
        CartService.removeItem({
          userId: 'user123',
          productId: 'prod999',
        })
      ).rejects.toThrow('ITEM_NOT_IN_CART');
    });
  });
});

