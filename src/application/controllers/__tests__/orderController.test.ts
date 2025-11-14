import { Response } from 'express';
import { AuthReq } from '../../middlewares/auth';
import * as OrderService from '../../../domain/services/orderService';
import { OrderModel } from '../../../domain/models/orders/orderModel';
import { OrderStatus } from '../../../domain/models/orders/orderStatus';
import {
  emitOrderTracking,
  emitOrderCustomerConfirmed,
} from '../../../infrastructure/websockets/socket.gateway';
import {
  adminSummary,
  adminTopProducts,
  adminDaily,
  adminAutoCancel,
  confirm,
  advanceStatus,
  cancel,
  get,
  list,
  getTracking,
  updateTracking,
  confirmDelivery,
} from '../orderController';

jest.mock('../../../domain/services/orderService');
jest.mock('../../../domain/models/orders/orderModel');
jest.mock('../../../infrastructure/websockets/socket.gateway');

const mockOrderService = OrderService as jest.Mocked<typeof OrderService>;
const mockOrderModel = OrderModel as jest.Mocked<typeof OrderModel>;
const mockEmitOrderTracking = emitOrderTracking as jest.MockedFunction<typeof emitOrderTracking>;
const mockEmitOrderCustomerConfirmed = emitOrderCustomerConfirmed as jest.MockedFunction<typeof emitOrderCustomerConfirmed>;

describe('OrderController', () => {
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
      query: {},
    };
    jest.clearAllMocks();
  });

  describe('adminSummary', () => {
    it('debería retornar resumen de órdenes', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      mockReq.query = { from: '2024-01-01', to: '2024-01-31' };
      mockOrderModel.aggregate = jest.fn().mockResolvedValue([
        [{ _id: 'PENDIENTE', count: 5 }],
        [{ totalCents: 100000 }],
      ]);

      await adminSummary(mockReq as AuthReq, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
      const call = mockJson.mock.calls[0][0];
      expect(call.byStatus).toBeDefined();
      expect(call.revenueCents).toBeDefined();
    });
  });

  describe('adminTopProducts', () => {
    it('debería retornar productos top', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      mockReq.query = { limit: '10' };
      mockOrderModel.aggregate = jest.fn().mockResolvedValue([
        { _id: 'prod1', name: 'Product 1', units: 100 },
      ]);

      await adminTopProducts(mockReq as AuthReq, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ items: expect.any(Array) });
    });
  });

  describe('adminDaily', () => {
    it('debería retornar datos diarios', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      mockReq.query = { days: '14' };
      mockOrderModel.aggregate = jest.fn().mockResolvedValue([
        { _id: '2024-01-15', orders: 10, paidCents: 50000 },
      ]);

      await adminDaily(mockReq as AuthReq, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ items: expect.any(Array) });
    });
  });

  describe('adminAutoCancel', () => {
    it('debería ejecutar auto-cancelación', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      mockReq.body = { hours: 48 };
      mockOrderService.autoCancelStalePending.mockResolvedValue({ ok: true, processed: 5 } as any);

      await adminAutoCancel(mockReq as AuthReq, mockRes as Response);

      expect(mockOrderService.autoCancelStalePending).toHaveBeenCalledWith(48);
      expect(mockJson).toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('debería confirmar orden exitosamente', async () => {
      const mockOrder = { orderId: 'ORD-123', status: 'PENDIENTE' };
      mockOrderService.confirmOrder.mockResolvedValue(mockOrder as any);
      mockReq.body = { checkoutId: 'checkout-123', email: 'test@example.com' };

      await confirm(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockOrder);
    });

    it('debería fallar sin checkoutId y email', async () => {
      mockReq.body = {};

      await confirm(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'checkoutId y email son requeridos' });
    });
  });

  describe('advanceStatus', () => {
    it('debería avanzar estado exitosamente', async () => {
      const mockOrder = { orderId: 'ORD-123', status: 'PROCESANDO' };
      mockOrderService.advanceOrderStatus.mockResolvedValue(mockOrder as any);
      mockReq.params = { orderId: 'ORD-123' };
      mockReq.body = { status: 'PROCESANDO' };

      await advanceStatus(mockReq as AuthReq, mockRes as Response);

      expect(mockOrderService.advanceOrderStatus).toHaveBeenCalledWith('ORD-123', 'PROCESANDO');
      expect(mockJson).toHaveBeenCalledWith(mockOrder);
    });
  });

  describe('cancel', () => {
    it('debería cancelar orden exitosamente', async () => {
      mockOrderService.cancelOrder.mockResolvedValue({ ok: true } as any);
      mockReq.params = { orderId: 'ORD-123' };
      mockReq.body = { reason: 'Cancelado por cliente' };

      await cancel(mockReq as AuthReq, mockRes as Response);

      expect(mockOrderService.cancelOrder).toHaveBeenCalledWith('ORD-123', {
        role: 'customer',
        userId: '12345678',
        reason: 'Cancelado por cliente',
      });
      expect(mockJson).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('get', () => {
    it('debería obtener orden como admin', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      mockReq.params = { orderId: 'ORD-123' };
      const mockOrder = { orderId: 'ORD-123', status: 'PENDIENTE' };
      mockOrderModel.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOrder),
      }) as any;

      await get(mockReq as AuthReq, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(mockOrder);
    });

    it('debería obtener orden como customer', async () => {
      const mockOrder = { orderId: 'ORD-123', status: 'PENDIENTE' };
      mockOrderService.getMyOrder.mockResolvedValue(mockOrder as any);
      mockReq.params = { orderId: 'ORD-123' };

      await get(mockReq as AuthReq, mockRes as Response);

      expect(mockOrderService.getMyOrder).toHaveBeenCalledWith('12345678', 'ORD-123');
      expect(mockJson).toHaveBeenCalledWith(mockOrder);
    });

    it('debería manejar orden no encontrada como admin', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      mockReq.params = { orderId: 'ORD-999' };
      mockOrderModel.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }) as any;

      await get(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Orden no encontrada' });
    });
  });

  describe('list', () => {
    it('debería listar órdenes como admin', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      mockReq.query = { status: 'PENDIENTE' };
      const mockOrders = [{ orderId: 'ORD-123' }];
      mockOrderModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockOrders),
          }),
        }),
      }) as any;

      await list(mockReq as AuthReq, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({ items: mockOrders, total: 1 });
    });

    it('debería listar órdenes como customer', async () => {
      const mockOrders = [{ orderId: 'ORD-123' }];
      mockOrderService.listMyOrders.mockResolvedValue(mockOrders as any);
      mockReq.query = { status: 'PENDIENTE' };

      await list(mockReq as AuthReq, mockRes as Response);

      expect(mockOrderService.listMyOrders).toHaveBeenCalledWith('12345678', 'PENDIENTE');
      expect(mockJson).toHaveBeenCalledWith({ items: mockOrders, total: 1 });
    });
  });

  describe('getTracking', () => {
    it('debería obtener tracking exitosamente', async () => {
      const mockTracking = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.PREPARANDO_PEDIDO,
        trackingHistory: [],
      };
      mockOrderService.getOrderTracking.mockResolvedValue(mockTracking as any);
      mockReq.params = { orderId: 'ORD-123' };

      await getTracking(mockReq as AuthReq, mockRes as Response);

      expect(mockOrderService.getOrderTracking).toHaveBeenCalledWith('ORD-123');
      expect(mockJson).toHaveBeenCalledWith(mockTracking);
    });
  });

  describe('updateTracking', () => {
    it('debería actualizar tracking exitosamente', async () => {
      const mockTracking = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.PREPARANDO_PEDIDO,
        trackingHistory: [],
      };
      mockOrderService.updateOrderTrackingStatus.mockResolvedValue(mockTracking as any);
      mockReq.params = { orderId: 'ORD-123' };
      mockReq.body = { status: OrderStatus.PREPARANDO_PEDIDO };

      await updateTracking(mockReq as AuthReq, mockRes as Response);

      expect(mockOrderService.updateOrderTrackingStatus).toHaveBeenCalledWith(
        'ORD-123',
        OrderStatus.PREPARANDO_PEDIDO,
        '12345678'
      );
      expect(mockEmitOrderTracking).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(mockTracking);
    });

    it('debería fallar con status inválido', async () => {
      mockReq.params = { orderId: 'ORD-123' };
      mockReq.body = { status: 'INVALID_STATUS' };

      await updateTracking(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'status inválido' });
    });
  });

  describe('confirmDelivery', () => {
    it('debería confirmar entrega exitosamente', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.COMPLETADO,
        trackingHistory: [],
      };
      mockOrderService.customerConfirmDelivery.mockResolvedValue(mockOrder as any);
      mockReq.params = { orderId: 'ORD-123' };

      await confirmDelivery(mockReq as AuthReq, mockRes as Response);

      expect(mockOrderService.customerConfirmDelivery).toHaveBeenCalledWith('12345678', 'ORD-123');
      expect(mockEmitOrderTracking).toHaveBeenCalled();
      expect(mockEmitOrderCustomerConfirmed).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({ ok: true, order: mockOrder });
    });
  });
});

