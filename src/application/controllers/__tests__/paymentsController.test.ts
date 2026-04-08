import { Response } from 'express';
import { AuthReq } from '../../middlewares/auth';
import * as PaymentsService from '../../../domain/services/paymentsServices';
import {
  listMyMethods,
  addMethod,
  setDefault,
  removeMethod,
  createPaymentIntent,
  confirmCardPayment,
  adminConfirmTransfer,
  adminMarkCodPaid,
} from '../paymentsController';

jest.mock('../../../domain/services/paymentsServices');

const mockPaymentsService = PaymentsService as jest.Mocked<typeof PaymentsService>;

describe('PaymentsController', () => {
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

  describe('listMyMethods', () => {
    it('debería listar métodos de pago exitosamente', async () => {
      const mockMethods = [
        { id: 'method1', type: 'card', provider: 'visa' },
        { id: 'method2', type: 'card', provider: 'mastercard' },
      ];
      mockPaymentsService.listMyMethods.mockResolvedValue(mockMethods as any);

      await listMyMethods(mockReq as AuthReq, mockRes as Response);

      expect(mockPaymentsService.listMyMethods).toHaveBeenCalledWith('12345678');
      expect(mockJson).toHaveBeenCalledWith({ items: mockMethods, total: 2 });
    });
  });

  describe('addMethod', () => {
    it('debería agregar un método de pago exitosamente', async () => {
      const mockMethod = { id: 'method1', type: 'card', provider: 'visa' };
      mockPaymentsService.addMethod.mockResolvedValue(mockMethod as any);
      mockReq.body = {
        type: 'card',
        provider: 'visa',
        cardNumber: '4111111111111111',
        setDefault: true,
      };

      await addMethod(mockReq as AuthReq, mockRes as Response);

      expect(mockPaymentsService.addMethod).toHaveBeenCalledWith('12345678', {
        type: 'card',
        provider: 'visa',
        cardNumber: '4111111111111111',
        setDefault: true,
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockMethod);
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('INVALID_CARD');
      error.status = 400;
      mockPaymentsService.addMethod.mockRejectedValue(error);

      await addMethod(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'INVALID_CARD' });
    });
  });

  describe('setDefault', () => {
    it('debería establecer método por defecto exitosamente', async () => {
      const mockMethod = { id: 'method1', isDefault: true };
      mockPaymentsService.setDefault.mockResolvedValue(mockMethod as any);
      mockReq.params = { id: 'method1' };

      await setDefault(mockReq as AuthReq, mockRes as Response);

      expect(mockPaymentsService.setDefault).toHaveBeenCalledWith('12345678', 'method1');
      expect(mockJson).toHaveBeenCalledWith(mockMethod);
    });
  });

  describe('removeMethod', () => {
    it('debería eliminar método exitosamente', async () => {
      mockPaymentsService.removeMethod.mockResolvedValue({ ok: true } as any);
      mockReq.params = { id: 'method1' };

      await removeMethod(mockReq as AuthReq, mockRes as Response);

      expect(mockPaymentsService.removeMethod).toHaveBeenCalledWith('12345678', 'method1');
      expect(mockJson).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('createPaymentIntent', () => {
    it('debería crear intent de pago exitosamente', async () => {
      const mockIntent = { id: 'intent1', status: 'pending' };
      mockPaymentsService.createPaymentIntent.mockResolvedValue(mockIntent as any);
      mockReq.params = { orderId: 'ORD-123' };
      mockReq.body = { method: 'card', paymentMethodId: 'method1' };

      await createPaymentIntent(mockReq as AuthReq, mockRes as Response);

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith({
        userId: '12345678',
        orderId: 'ORD-123',
        method: 'card',
        paymentMethodId: 'method1',
        provider: undefined,
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockIntent);
    });
  });

  describe('confirmCardPayment', () => {
    it('debería confirmar pago con tarjeta exitosamente', async () => {
      const mockResult = { id: 'intent1', status: 'succeeded' };
      mockPaymentsService.confirmCardPayment.mockResolvedValue(mockResult as any);
      mockReq.body = { intentId: 'intent1', succeed: true };

      await confirmCardPayment(mockReq as AuthReq, mockRes as Response);

      expect(mockPaymentsService.confirmCardPayment).toHaveBeenCalledWith('12345678', 'intent1', true);
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('adminConfirmTransfer', () => {
    it('debería confirmar transferencia como admin exitosamente', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      const mockResult = { orderId: 'ORD-123', paymentStatus: 'paid' };
      mockPaymentsService.adminConfirmTransfer.mockResolvedValue(mockResult as any);
      mockReq.params = { orderId: 'ORD-123' };

      await adminConfirmTransfer(mockReq as AuthReq, mockRes as Response);

      expect(mockPaymentsService.adminConfirmTransfer).toHaveBeenCalledWith('ORD-123');
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('adminMarkCodPaid', () => {
    it('debería marcar COD como pagado exitosamente', async () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      const mockResult = { orderId: 'ORD-123', paymentStatus: 'paid' };
      mockPaymentsService.adminMarkCodPaid.mockResolvedValue(mockResult as any);
      mockReq.params = { orderId: 'ORD-123' };

      await adminMarkCodPaid(mockReq as AuthReq, mockRes as Response);

      expect(mockPaymentsService.adminMarkCodPaid).toHaveBeenCalledWith('ORD-123');
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });
  });
});

