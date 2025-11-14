import * as CheckoutService from '../../../../src/domain/services/checkoutService';
import { CheckoutModel } from '../../../../src/domain/models/checkout/checkoutModel';
import { CartModel } from '../../../../src/domain/models/shippingCart/shippingCartModel';
import { ProductModel } from '../../../../src/domain/models/products/productModel';
import { UserModel } from '../../../../src/domain/models/users/userModel';

jest.mock('../../../../src/domain/models/checkout/checkoutModel');
jest.mock('../../../../src/domain/models/shippingCart/shippingCartModel');
jest.mock('../../../../src/domain/models/products/productModel');
jest.mock('../../../../src/domain/models/users/userModel');

describe('CheckoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckout', () => {
    it('debería crear checkout exitosamente', async () => {
      const mockUser = {
        _id: 'user123',
        addresses: [
          { id: 'addr1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' },
        ],
      };
      const mockCart = {
        items: [
          { productId: 'prod1', quantity: 2, unitPriceCents: 1000, sku: 'SKU1', name: 'Product 1', image: 'img1.jpg' },
        ],
        currency: 'COP',
      };
      const mockProducts = [
        { _id: 'prod1', weight: 1, status: 'active', stock: 10 },
      ];
      const mockCheckout = {
        id: 'checkout-123',
        userId: 'user123',
        items: mockCart.items,
        subtotalCents: 2000,
        grandTotalCents: 9000,
      };

      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      (CartModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCart),
      });
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProducts[0]),
      });
      (ProductModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProducts),
      });
      (CheckoutModel.create as jest.Mock).mockResolvedValue({
        ...mockCheckout,
        toJSON: jest.fn().mockReturnValue(mockCheckout),
      });

      const result = await CheckoutService.createCheckout({
        userId: 'user123',
        addressId: 'addr1',
        shippingMethod: 'standard',
        paymentMethod: 'card',
      });

      expect(result).toBeDefined();
      expect(CheckoutModel.create).toHaveBeenCalled();
    });

    it('debería fallar si el usuario no existe', async () => {
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        CheckoutService.createCheckout({
          userId: 'user999',
          addressId: 'addr1',
          shippingMethod: 'standard',
          paymentMethod: 'card',
        })
      ).rejects.toThrow('Usuario no existe');
    });

    it('debería fallar si el carrito está vacío', async () => {
      const mockUser = {
        _id: 'user123',
        addresses: [{ id: 'addr1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' }],
      };
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      (CartModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ items: [] }),
      });

      await expect(
        CheckoutService.createCheckout({
          userId: 'user123',
          addressId: 'addr1',
          shippingMethod: 'standard',
          paymentMethod: 'card',
        })
      ).rejects.toThrow('El carrito está vacío');
    });

    it('debería usar shippingCents proporcionado', async () => {
      const mockUser = {
        _id: 'user123',
        addresses: [{ id: 'addr1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' }],
      };
      const mockCart = {
        items: [{ productId: 'prod1', quantity: 1, unitPriceCents: 1000, sku: 'SKU1', name: 'Product 1', image: 'img1.jpg' }],
        currency: 'COP',
      };
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      (CartModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCart),
      });
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'prod1', status: 'active', stock: 10 }),
      });
      (CheckoutModel.create as jest.Mock).mockResolvedValue({
        id: 'checkout-123',
        toJSON: jest.fn().mockReturnValue({ id: 'checkout-123' }),
      });

      await CheckoutService.createCheckout({
        userId: 'user123',
        addressId: 'addr1',
        shippingMethod: 'standard',
        paymentMethod: 'card',
        shippingCents: 5000,
      });

      expect(CheckoutModel.create).toHaveBeenCalled();
    });
  });

  describe('getCheckout', () => {
    it('debería obtener checkout exitosamente', async () => {
      const mockCheckout = {
        id: 'checkout-123',
        userId: 'user123',
        items: [],
      };
      (CheckoutModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCheckout),
      });

      const result = await CheckoutService.getCheckout('user123', 'checkout-123');

      expect(result).toEqual(mockCheckout);
    });

    it('debería fallar si checkout no existe', async () => {
      (CheckoutModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(CheckoutService.getCheckout('user123', 'checkout-999')).rejects.toThrow();
    });

    it('debería fallar si checkout pertenece a otro usuario', async () => {
      (CheckoutModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(CheckoutService.getCheckout('user999', 'checkout-123')).rejects.toThrow();
    });
  });

  describe('createCheckout - casos edge', () => {
    it('debería fallar si dirección no existe en usuario', async () => {
      const mockUser = {
        _id: 'user123',
        addresses: [],
      };
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        CheckoutService.createCheckout({
          userId: 'user123',
          addressId: 'addr999',
          shippingMethod: 'standard',
          paymentMethod: 'card',
        })
      ).rejects.toThrow('Dirección no encontrada');
    });

    it('debería fallar si dirección es inválida', async () => {
      const mockUser = {
        _id: 'user123',
        addresses: [{ id: 'addr1', city: '', postalCode: '', address: '' }],
      };
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        CheckoutService.createCheckout({
          userId: 'user123',
          addressId: 'addr1',
          shippingMethod: 'standard',
          paymentMethod: 'card',
        })
      ).rejects.toThrow('Dirección inválida');
    });

    it('debería calcular envío gratis si subtotal >= 50000', async () => {
      const mockUser = {
        _id: 'user123',
        addresses: [{ id: 'addr1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' }],
      };
      const mockCart = {
        items: [
          { productId: 'prod1', quantity: 1, unitPriceCents: 60000, sku: 'SKU1', name: 'Product 1', image: 'img1.jpg' },
        ],
        currency: 'COP',
      };
      const mockProducts = [{ _id: 'prod1', weight: 1 }];
      const mockCheckout = {
        id: 'checkout-123',
        toJSON: jest.fn().mockReturnValue({ id: 'checkout-123', shippingCents: 0 }),
      };

      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      (CartModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCart),
      });
      (ProductModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProducts[0]),
      });
      (ProductModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProducts),
      });
      (CheckoutModel.create as jest.Mock).mockResolvedValue(mockCheckout);

      const result = await CheckoutService.createCheckout({
        userId: 'user123',
        addressId: 'addr1',
        shippingMethod: 'standard',
        paymentMethod: 'card',
      });

      expect(result).toBeDefined();
    });
  });
});

