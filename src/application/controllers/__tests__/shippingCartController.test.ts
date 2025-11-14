import { Response } from 'express';
import { AuthReq } from '../../middlewares/auth';
import * as CartService from '../../../domain/services/shippingCartService';
import { getMyCart, addItem, setItemQuantity, removeItem } from '../shippingCartController';

jest.mock('../../../domain/services/shippingCartService');

const mockCartService = CartService as jest.Mocked<typeof CartService>;

describe('ShippingCartController', () => {
  let mockReq: Partial<AuthReq>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    mockReq = {
      user: { sub: '12345678', role: 'customer', emailVerified: true },
      body: {},
      params: {},
    };
    jest.clearAllMocks();
  });

  describe('getMyCart', () => {
    it('debería obtener el carrito exitosamente', async () => {
      const mockCart = {
        userId: '12345678',
        items: [],
        subtotalCents: 0,
      };
      mockCartService.getMyCart.mockResolvedValue(mockCart as any);

      await getMyCart(mockReq as AuthReq, mockRes as Response);

      expect(mockCartService.getMyCart).toHaveBeenCalledWith('12345678');
      expect(mockJson).toHaveBeenCalledWith(mockCart);
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('CART_ERROR');
      error.status = 500;
      mockCartService.getMyCart.mockRejectedValue(error);

      await getMyCart(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'CART_ERROR' });
    });
  });

  describe('addItem', () => {
    it('debería agregar un item exitosamente', async () => {
      const mockCart = {
        userId: '12345678',
        items: [{ productId: 'prod1', quantity: 2 }],
        subtotalCents: 2000,
      };
      mockCartService.addItem.mockResolvedValue(mockCart as any);
      mockReq.body = { productId: 'prod1', quantity: 2 };

      await addItem(mockReq as AuthReq, mockRes as Response);

      expect(mockCartService.addItem).toHaveBeenCalledWith({
        userId: '12345678',
        productId: 'prod1',
        quantity: 2,
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockCart);
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('PRODUCT_NOT_FOUND');
      error.status = 404;
      mockCartService.addItem.mockRejectedValue(error);
      mockReq.body = { productId: 'prod999', quantity: 1 };

      await addItem(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'PRODUCT_NOT_FOUND' });
    });
  });

  describe('setItemQuantity', () => {
    it('debería actualizar la cantidad exitosamente', async () => {
      const mockCart = {
        userId: '12345678',
        items: [{ productId: 'prod1', quantity: 5 }],
        subtotalCents: 5000,
      };
      mockCartService.setItemQuantity.mockResolvedValue(mockCart as any);
      mockReq.params = { productId: 'prod1' };
      mockReq.body = { quantity: 5 };

      await setItemQuantity(mockReq as AuthReq, mockRes as Response);

      expect(mockCartService.setItemQuantity).toHaveBeenCalledWith({
        userId: '12345678',
        productId: 'prod1',
        quantity: 5,
      });
      expect(mockJson).toHaveBeenCalledWith(mockCart);
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('ITEM_NOT_FOUND');
      error.status = 404;
      mockCartService.setItemQuantity.mockRejectedValue(error);
      mockReq.params = { productId: 'prod999' };
      mockReq.body = { quantity: 1 };

      await setItemQuantity(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'ITEM_NOT_FOUND' });
    });
  });

  describe('removeItem', () => {
    it('debería eliminar un item exitosamente', async () => {
      const mockCart = {
        userId: '12345678',
        items: [],
        subtotalCents: 0,
      };
      mockCartService.removeItem.mockResolvedValue(mockCart as any);
      mockReq.params = { productId: 'prod1' };

      await removeItem(mockReq as AuthReq, mockRes as Response);

      expect(mockCartService.removeItem).toHaveBeenCalledWith({
        userId: '12345678',
        productId: 'prod1',
      });
      expect(mockJson).toHaveBeenCalledWith(mockCart);
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('ITEM_NOT_FOUND');
      error.status = 404;
      mockCartService.removeItem.mockRejectedValue(error);
      mockReq.params = { productId: 'prod999' };

      await removeItem(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'ITEM_NOT_FOUND' });
    });
  });
});

