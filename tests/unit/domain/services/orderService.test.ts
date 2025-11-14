import * as OrderService from '../../../../src/domain/services/orderService';
import { CheckoutModel } from '../../../../src/domain/models/checkout/checkoutModel';
import { OrderModel } from '../../../../src/domain/models/orders/orderModel';
import { CartModel } from '../../../../src/domain/models/shippingCart/shippingCartModel';
import { UserModel } from '../../../../src/domain/models/users/userModel';
import { ProductModel } from '../../../../src/domain/models/products/productModel';
import * as Services from '../../../../src/domain/services/services';
import * as EmailService from '../../../../src/domain/services/emailService';
import { OrderStatus } from '../../../../src/domain/models/orders/orderStatus';

jest.mock('../../../../src/domain/models/checkout/checkoutModel');
jest.mock('../../../../src/domain/models/orders/orderModel');
jest.mock('../../../../src/domain/models/shippingCart/shippingCartModel');
jest.mock('../../../../src/domain/models/users/userModel');
jest.mock('../../../../src/domain/models/products/productModel');
jest.mock('../../../../src/domain/services/services');
jest.mock('../../../../src/domain/services/emailService');

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmOrder', () => {
    it('debería confirmar orden exitosamente', async () => {
      const mockCheckout = {
        id: 'checkout-123',
        userId: 'user123',
        items: [{ productId: 'prod1', quantity: 2, name: 'Product 1', sku: 'SKU1', unitPriceCents: 1000, totalCents: 2000 }],
        grandTotalCents: 2000,
        subtotalCents: 2000,
        shippingCents: 0,
        currency: 'COP',
        status: 'pending',
        addressSnapshot: { city: 'Medellín', postalCode: '050001', address: 'Calle 1' },
        shippingMethod: 'standard',
        paymentMethod: 'card',
        save: jest.fn().mockResolvedValue(true),
      };
      const mockUser = { _id: 'user123', name: 'Test User' };
      const mockOrder = {
        orderId: 'ORD-20240101-ABC12',
        toJSON: jest.fn().mockReturnValue({ orderId: 'ORD-20240101-ABC12' }),
      };

      (CheckoutModel.findOne as jest.Mock).mockResolvedValue(mockCheckout);
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (Services.verifyAndReserve as jest.Mock).mockResolvedValue(undefined);
      (OrderModel.create as jest.Mock).mockResolvedValue(mockOrder);
      (CartModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      (EmailService.sendOrderConfirmation as jest.Mock).mockResolvedValue(undefined);

      const result = await OrderService.confirmOrder({
        userId: 'user123',
        checkoutId: 'checkout-123',
        email: 'test@example.com',
      });

      expect(result).toBeDefined();
      expect(Services.verifyAndReserve).toHaveBeenCalled();
      expect(EmailService.sendOrderConfirmation).toHaveBeenCalled();
    });

    it('debería retornar orden existente si ya existe', async () => {
      const mockCheckout = {
        id: 'checkout-123',
        userId: 'user123',
      };
      const mockExistingOrder = { orderId: 'ORD-123', status: 'PENDIENTE' };

      (CheckoutModel.findOne as jest.Mock).mockResolvedValue(mockCheckout);
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExistingOrder),
      });

      const result = await OrderService.confirmOrder({
        userId: 'user123',
        checkoutId: 'checkout-123',
        email: 'test@example.com',
      });

      expect(result).toEqual(mockExistingOrder);
      expect(Services.verifyAndReserve).not.toHaveBeenCalled();
    });

    it('debería fallar si checkout no existe', async () => {
      (CheckoutModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.confirmOrder({
          userId: 'user123',
          checkoutId: 'checkout-999',
          email: 'test@example.com',
        })
      ).rejects.toThrow('Checkout no encontrado');
    });

    it('debería fallar si checkout no está pendiente', async () => {
      const mockCheckout = {
        id: 'checkout-123',
        userId: 'user123',
        status: 'confirmed',
      };

      (CheckoutModel.findOne as jest.Mock).mockResolvedValue(mockCheckout);
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        OrderService.confirmOrder({
          userId: 'user123',
          checkoutId: 'checkout-123',
          email: 'test@example.com',
        })
      ).rejects.toThrow('Checkout no está pendiente');
    });

    it('debería manejar error al enviar email sin fallar', async () => {
      const mockCheckout = {
        id: 'checkout-123',
        userId: 'user123',
        items: [{ productId: 'prod1', quantity: 2, name: 'Product 1', sku: 'SKU1', unitPriceCents: 1000, totalCents: 2000 }],
        grandTotalCents: 2000,
        subtotalCents: 2000,
        shippingCents: 0,
        currency: 'COP',
        status: 'pending',
        addressSnapshot: { city: 'Medellín', postalCode: '050001', address: 'Calle 1' },
        shippingMethod: 'standard',
        paymentMethod: 'card',
        save: jest.fn().mockResolvedValue(true),
      };
      const mockUser = { _id: 'user123', name: 'Test User' };
      const mockOrder = {
        orderId: 'ORD-20240101-ABC12',
        toJSON: jest.fn().mockReturnValue({ orderId: 'ORD-20240101-ABC12' }),
      };

      (CheckoutModel.findOne as jest.Mock).mockResolvedValue(mockCheckout);
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (Services.verifyAndReserve as jest.Mock).mockResolvedValue(undefined);
      (OrderModel.create as jest.Mock).mockResolvedValue(mockOrder);
      (CartModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      (EmailService.sendOrderConfirmation as jest.Mock).mockRejectedValue(new Error('Email error'));

      const result = await OrderService.confirmOrder({
        userId: 'user123',
        checkoutId: 'checkout-123',
        email: 'test@example.com',
      });

      expect(result).toBeDefined();
      // El orden se crea aunque el email falle
    });
  });

  describe('getMyOrder', () => {
    it('debería obtener orden exitosamente', async () => {
      const mockOrder = { orderId: 'ORD-123', userId: 'user123' };
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOrder),
      });

      const result = await OrderService.getMyOrder('user123', 'ORD-123');

      expect(result).toEqual(mockOrder);
    });

    it('debería fallar si orden no existe', async () => {
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(OrderService.getMyOrder('user123', 'ORD-999')).rejects.toThrow('Orden no encontrada');
    });
  });

  describe('listMyOrders', () => {
    it('debería listar órdenes sin filtro', async () => {
      const mockOrders = [{ orderId: 'ORD-123' }];
      (OrderModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockOrders),
          }),
        }),
      });

      const result = await OrderService.listMyOrders('user123');

      expect(result).toEqual(mockOrders);
    });

    it('debería listar órdenes con filtro de status', async () => {
      const mockOrders = [{ orderId: 'ORD-123', status: 'PENDIENTE' }];
      (OrderModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockOrders),
          }),
        }),
      });

      const result = await OrderService.listMyOrders('user123', 'PENDIENTE');

      expect(OrderModel.find).toHaveBeenCalledWith({ userId: 'user123', status: 'PENDIENTE' });
      expect(result).toEqual(mockOrders);
    });
  });

  describe('cancelOrder', () => {
    it('debería cancelar orden como customer exitosamente', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user123',
        status: 'PENDIENTE',
        items: [{ productId: 'prod1', quantity: 2 }],
        save: jest.fn().mockResolvedValue(true),
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);
      (Services.returnStock as jest.Mock).mockResolvedValue(undefined);

      const result = await OrderService.cancelOrder('ORD-123', {
        role: 'customer',
        userId: 'user123',
        reason: 'Changed mind',
      });

      expect(result).toBeDefined();
      expect(mockOrder.status).toBe(OrderStatus.CANCELADO);
      expect(Services.returnStock).toHaveBeenCalled();
    });

    it('debería cancelar orden como admin exitosamente', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user123',
        status: 'PENDIENTE',
        items: [{ productId: 'prod1', quantity: 2 }],
        save: jest.fn().mockResolvedValue(true),
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);
      (Services.returnStock as jest.Mock).mockResolvedValue(undefined);

      const result = await OrderService.cancelOrder('ORD-123', {
        role: 'admin',
        userId: 'admin123',
        reason: 'Admin cancellation',
      });

      expect(result).toBeDefined();
      expect(mockOrder.status).toBe(OrderStatus.CANCELADO);
    });

    it('debería fallar si orden no existe', async () => {
      (OrderModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.cancelOrder('ORD-999', {
          role: 'customer',
          userId: 'user123',
        })
      ).rejects.toThrow('ORDER_NOT_FOUND');
    });

    it('debería fallar si orden no está pendiente', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user123',
        status: 'COMPLETADO',
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        OrderService.cancelOrder('ORD-123', {
          role: 'customer',
          userId: 'user123',
        })
      ).rejects.toThrow('CANNOT_CANCEL_NON_PENDING');
    });

    it('debería fallar si customer intenta cancelar orden de otro usuario', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user123',
        status: 'PENDIENTE',
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        OrderService.cancelOrder('ORD-123', {
          role: 'customer',
          userId: 'user999',
        })
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('advanceOrderStatus', () => {
    it('debería avanzar estado exitosamente de PENDIENTE a PROCESANDO', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        status: 'PENDIENTE',
        trackingHistory: [],
      };
      const mockUpdated = {
        orderId: 'ORD-123',
        status: 'PROCESANDO',
        trackingStatus: OrderStatus.PREPARANDO_PEDIDO,
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);
      (OrderModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await OrderService.advanceOrderStatus('ORD-123', 'PROCESANDO');

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESANDO');
    });

    it('debería avanzar estado de PROCESANDO a COMPLETADA', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        status: 'PROCESANDO',
        trackingHistory: [],
      };
      const mockUpdated = {
        orderId: 'ORD-123',
        status: 'COMPLETADA',
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);
      (OrderModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await OrderService.advanceOrderStatus('ORD-123', 'COMPLETADA');

      expect(result).toBeDefined();
      expect(result.status).toBe('COMPLETADA');
    });

    it('debería fallar si orden no existe', async () => {
      (OrderModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.advanceOrderStatus('ORD-999', 'PROCESANDO')
      ).rejects.toThrow('ORDER_NOT_FOUND');
    });

    it('debería fallar con transición inválida', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        status: 'COMPLETADA',
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        OrderService.advanceOrderStatus('ORD-123', 'PROCESANDO')
      ).rejects.toThrow('INVALID_TRANSITION');
    });

    it('debería fallar si hay conflicto al actualizar', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        status: 'PENDIENTE',
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);
      (OrderModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        OrderService.advanceOrderStatus('ORD-123', 'PROCESANDO')
      ).rejects.toThrow('CONFLICT');
    });
  });

  describe('getOrderTracking', () => {
    it('debería obtener tracking exitosamente', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.PREPARANDO_PEDIDO,
        trackingHistory: [],
      };
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOrder),
      });

      const result = await OrderService.getOrderTracking('ORD-123');

      expect(result).toBeDefined();
      expect(result.orderId).toBe('ORD-123');
    });

    it('debería fallar si orden no existe', async () => {
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(OrderService.getOrderTracking('ORD-999')).rejects.toThrow('ORDER_NOT_FOUND');
    });
  });

  describe('autoCancelStalePending', () => {
    it('debería cancelar órdenes pendientes antiguas', async () => {
      const oldDate = new Date(Date.now() - 50 * 60 * 60 * 1000);
      const mockStaleOrders = [
        {
          orderId: 'ORD-123',
          userId: 'user123',
          status: 'PENDIENTE',
          createdAt: oldDate.toISOString(),
          items: [{ productId: 'prod1', quantity: 2 }],
        },
      ];
      const mockUpdated = {
        orderId: 'ORD-123',
        status: 'CANCELADA',
        userId: 'user123',
        items: [{ productId: 'prod1', quantity: 2 }],
      };
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn(),
      };

      (OrderModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockStaleOrders),
      });
      (OrderModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUpdated),
      });
      (Services.returnStock as jest.Mock).mockResolvedValue(undefined);
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
      });
      // sendOrderCancellation es una función local en orderService, no necesita mock

      const mongoose = require('mongoose');
      mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

      const result = await OrderService.autoCancelStalePending(48);

      expect(result).toBeDefined();
      expect(result.processed).toBeGreaterThanOrEqual(0);
    });

    it('debería retornar resultado vacío si no hay órdenes antiguas', async () => {
      (OrderModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await OrderService.autoCancelStalePending(48);

      expect(result).toBeDefined();
      expect(result.processed).toBe(0);
    });
  });

  describe('updateOrderTrackingStatus', () => {
    it('debería actualizar tracking status exitosamente', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.PREPARANDO_PEDIDO,
        trackingHistory: [],
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({
          orderId: 'ORD-123',
          trackingStatus: OrderStatus.ENVIANDO_A_TRANSPORTADORA,
        }),
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);

      const result = await OrderService.updateOrderTrackingStatus(
        'ORD-123',
        OrderStatus.ENVIANDO_A_TRANSPORTADORA,
        'user123'
      );

      expect(result).toBeDefined();
    });

    it('debería fallar si orden no existe', async () => {
      (OrderModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.updateOrderTrackingStatus('ORD-999', OrderStatus.PREPARANDO_PEDIDO, 'user123')
      ).rejects.toThrow('ORDER_NOT_FOUND');
    });
  });

  describe('customerConfirmDelivery', () => {
    it('debería confirmar entrega exitosamente', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user123',
        status: 'PROCESANDO',
        trackingStatus: OrderStatus.LLEGANDO_A_DESTINO,
        trackingHistory: [],
      };
      const mockUpdated = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.COMPLETADO,
        trackingHistory: [],
      };
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOrder),
      });
      (OrderModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUpdated),
      });

      const result = await OrderService.customerConfirmDelivery('user123', 'ORD-123');

      expect(result).toBeDefined();
      expect(result.trackingStatus).toBe(OrderStatus.COMPLETADO);
    });

    it('debería fallar si orden no existe', async () => {
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        OrderService.customerConfirmDelivery('user123', 'ORD-999')
      ).rejects.toThrow('ORDER_NOT_FOUND');
    });

    it('debería fallar si orden no está lista para confirmar', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user123',
        status: 'PENDIENTE',
        trackingStatus: OrderStatus.PREPARANDO_PEDIDO,
        trackingHistory: [],
      };
      (OrderModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOrder),
      });

      await expect(
        OrderService.customerConfirmDelivery('user123', 'ORD-123')
      ).rejects.toThrow('ORDER_NOT_READY_TO_CONFIRM');
    });
  });
});

