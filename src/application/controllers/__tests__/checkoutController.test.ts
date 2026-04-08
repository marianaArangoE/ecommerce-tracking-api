import { Response } from 'express';
import { AuthReq } from '../../middlewares/auth';
import * as CheckoutService from '../../../domain/services/checkoutService';
import { createCheckout, getCheckout } from '../checkoutController';

jest.mock('../../../domain/services/checkoutService');

const mockCheckoutService = CheckoutService as jest.Mocked<typeof CheckoutService>;

describe('CheckoutController', () => {
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

  describe('createCheckout', () => {
    it('debería crear un checkout exitosamente', async () => {
      const mockCheckout = {
        id: 'checkout-123',
        userId: '12345678',
        items: [],
        subtotalCents: 0,
        grandTotalCents: 0,
      };
      mockCheckoutService.createCheckout.mockResolvedValue(mockCheckout as any);
      mockReq.body = {
        addressId: 'addr-1',
        shippingMethod: 'standard',
        paymentMethod: 'card',
      };

      await createCheckout(mockReq as AuthReq, mockRes as Response);

      expect(mockCheckoutService.createCheckout).toHaveBeenCalledWith({
        userId: '12345678',
        addressId: 'addr-1',
        shippingMethod: 'standard',
        paymentMethod: 'card',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockCheckout);
    });

    it('debería manejar errores', async () => {
      const error = new Error('CART_EMPTY');
      mockCheckoutService.createCheckout.mockRejectedValue(error);

      await createCheckout(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'CART_EMPTY' });
    });
  });

  describe('getCheckout', () => {
    it('debería obtener un checkout exitosamente', async () => {
      const mockCheckout = {
        id: 'checkout-123',
        userId: '12345678',
        items: [],
      };
      mockCheckoutService.getCheckout.mockResolvedValue(mockCheckout as any);
      mockReq.params = { id: 'checkout-123' };

      await getCheckout(mockReq as AuthReq, mockRes as Response);

      expect(mockCheckoutService.getCheckout).toHaveBeenCalledWith('12345678', 'checkout-123');
      expect(mockJson).toHaveBeenCalledWith(mockCheckout);
    });

    it('debería manejar checkout no encontrado', async () => {
      const error = new Error('CHECKOUT_NOT_FOUND');
      mockCheckoutService.getCheckout.mockRejectedValue(error);
      mockReq.params = { id: 'checkout-999' };

      await getCheckout(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'CHECKOUT_NOT_FOUND' });
    });
  });
});

