import { Response, NextFunction } from 'express';
import { AuthReq } from '../../../middlewares/auth';
import * as OrderService from '../../../../domain/services/orderService';
import { OrderStatus } from '../../../../domain/models/orders/orderStatus';
import {
  emitOrderTracking,
  emitOrderCustomerConfirmed,
} from '../../../../infrastructure/websockets/socket.gateway';
import { OrdersController } from '../orderController';

jest.mock('../../../../domain/services/orderService');
jest.mock('../../../../infrastructure/websockets/socket.gateway');

const mockOrderService = OrderService as jest.Mocked<typeof OrderService>;
const mockEmitOrderTracking = emitOrderTracking as jest.MockedFunction<typeof emitOrderTracking>;
const mockEmitOrderCustomerConfirmed = emitOrderCustomerConfirmed as jest.MockedFunction<typeof emitOrderCustomerConfirmed>;

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockReq: Partial<AuthReq>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    controller = new OrdersController();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    mockNext = jest.fn();
    mockReq = {
      user: { sub: '12345678', role: 'customer', emailVerified: true },
      body: {},
      params: {},
      query: {},
    };
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debería crear orden exitosamente', async () => {
      const mockOrder = { orderId: 'ORD-123', status: 'PENDIENTE' };
      mockOrderService.confirmOrder.mockResolvedValue(mockOrder as any);
      mockReq.body = { checkoutId: 'checkout-123', email: 'test@example.com' };

      await controller.create(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockOrderService.confirmOrder).toHaveBeenCalledWith({
        userId: '12345678',
        checkoutId: 'checkout-123',
        email: 'test@example.com',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockOrder);
    });

    it('debería manejar errores', async () => {
      const error = new Error('Checkout not found');
      mockOrderService.confirmOrder.mockRejectedValue(error);
      mockReq.body = { checkoutId: 'checkout-999', email: 'test@example.com' };

      await controller.create(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('debería obtener orden exitosamente', async () => {
      const mockOrder = { orderId: 'ORD-123', status: 'PENDIENTE' };
      mockOrderService.getMyOrder.mockResolvedValue(mockOrder as any);
      mockReq.params = { id: 'ORD-123' };

      await controller.getById(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockOrderService.getMyOrder).toHaveBeenCalledWith('12345678', 'ORD-123');
      expect(mockJson).toHaveBeenCalledWith(mockOrder);
    });

    it('debería manejar errores', async () => {
      const error = new Error('Order not found');
      mockOrderService.getMyOrder.mockRejectedValue(error);
      mockReq.params = { id: 'ORD-999' };

      await controller.getById(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listMine', () => {
    it('debería listar órdenes exitosamente', async () => {
      const mockOrders = [{ orderId: 'ORD-123' }];
      mockOrderService.listMyOrders.mockResolvedValue(mockOrders as any);
      mockReq.query = { status: 'PENDIENTE' };

      await controller.listMine(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockOrderService.listMyOrders).toHaveBeenCalledWith('12345678', 'PENDIENTE');
      expect(mockJson).toHaveBeenCalledWith(mockOrders);
    });

    it('debería listar órdenes sin filtro', async () => {
      const mockOrders = [{ orderId: 'ORD-123' }];
      mockOrderService.listMyOrders.mockResolvedValue(mockOrders as any);

      await controller.listMine(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockOrderService.listMyOrders).toHaveBeenCalledWith('12345678', undefined);
    });
  });

  describe('getTracking', () => {
    it('debería obtener tracking usando orderId', async () => {
      const mockTracking = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.PREPARANDO_PEDIDO,
        trackingHistory: [],
      };
      mockOrderService.getOrderTracking.mockResolvedValue(mockTracking as any);
      mockReq.params = { orderId: 'ORD-123' };

      await controller.getTracking(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockOrderService.getOrderTracking).toHaveBeenCalledWith('ORD-123');
      expect(mockJson).toHaveBeenCalledWith(mockTracking);
    });

    it('debería obtener tracking usando id si orderId no existe', async () => {
      const mockTracking = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.PREPARANDO_PEDIDO,
        trackingHistory: [],
      };
      mockOrderService.getOrderTracking.mockResolvedValue(mockTracking as any);
      mockReq.params = { id: 'ORD-123' };

      await controller.getTracking(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockOrderService.getOrderTracking).toHaveBeenCalledWith('ORD-123');
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

      await controller.updateTracking(mockReq as AuthReq, mockRes as Response, mockNext);

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

      await controller.updateTracking(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'status inválido' });
      expect(mockOrderService.updateOrderTrackingStatus).not.toHaveBeenCalled();
    });

    it('debería manejar errores', async () => {
      const error = new Error('Order not found');
      mockOrderService.updateOrderTrackingStatus.mockRejectedValue(error);
      mockReq.params = { orderId: 'ORD-999' };
      mockReq.body = { status: OrderStatus.PREPARANDO_PEDIDO };

      await controller.updateTracking(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
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

      await controller.confirmDelivery(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockOrderService.customerConfirmDelivery).toHaveBeenCalledWith('12345678', 'ORD-123');
      expect(mockEmitOrderTracking).toHaveBeenCalled();
      expect(mockEmitOrderCustomerConfirmed).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({ ok: true, order: mockOrder });
    });

    it('debería usar id si orderId no existe', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        trackingStatus: OrderStatus.COMPLETADO,
        trackingHistory: [],
      };
      mockOrderService.customerConfirmDelivery.mockResolvedValue(mockOrder as any);
      mockReq.params = { id: 'ORD-123' };

      await controller.confirmDelivery(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockOrderService.customerConfirmDelivery).toHaveBeenCalledWith('12345678', 'ORD-123');
    });

    it('debería manejar errores', async () => {
      const error = new Error('Order not found');
      mockOrderService.customerConfirmDelivery.mockRejectedValue(error);
      mockReq.params = { orderId: 'ORD-999' };

      await controller.confirmDelivery(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});

