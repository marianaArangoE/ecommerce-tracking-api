import * as PaymentsService from '../../../../src/domain/services/paymentsServices';
import { PaymentMethodModel, PaymentIntentModel } from '../../../../src/domain/models/payments/paymentsModel';
import { OrderModel } from '../../../../src/domain/models/orders/orderModel';

jest.mock('../../../../src/domain/models/payments/paymentsModel');
jest.mock('../../../../src/domain/models/orders/orderModel');

describe('PaymentsServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listMyMethods', () => {
    it('debería listar métodos de pago exitosamente', async () => {
      const mockMethods = [
        { id: 'method1', type: 'credit_card', isDefault: true },
        { id: 'method2', type: 'debit_card', isDefault: false },
      ];
      (PaymentMethodModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMethods),
        }),
      });

      const result = await PaymentsService.listMyMethods('user123');

      expect(result).toEqual(mockMethods);
      expect(PaymentMethodModel.find).toHaveBeenCalledWith({ userId: 'user123' });
    });
  });

  describe('addMethod', () => {
    it('debería agregar método de pago con tarjeta exitosamente', async () => {
      const mockMethod = {
        id: 'method1',
        type: 'credit_card',
        last4: '1234',
        token: 'tok_abc123',
        tokenized: true,
        toJSON: jest.fn().mockReturnValue({ id: 'method1' }),
      };
      (PaymentMethodModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });
      (PaymentMethodModel.create as jest.Mock).mockResolvedValue(mockMethod);

      const result = await PaymentsService.addMethod('user123', {
        type: 'credit_card',
        cardNumber: '4111111111111234',
        setDefault: true,
      });

      expect(result).toBeDefined();
      expect(PaymentMethodModel.updateMany).toHaveBeenCalled();
      expect(PaymentMethodModel.create).toHaveBeenCalled();
    });

    it('debería agregar método de pago sin tarjeta exitosamente', async () => {
      const mockMethod = {
        id: 'method1',
        type: 'paypal',
        toJSON: jest.fn().mockReturnValue({ id: 'method1' }),
      };
      (PaymentMethodModel.create as jest.Mock).mockResolvedValue(mockMethod);

      const result = await PaymentsService.addMethod('user123', {
        type: 'paypal',
        setDefault: false,
      });

      expect(result).toBeDefined();
      expect(PaymentMethodModel.create).toHaveBeenCalled();
    });

    it('debería fallar con número de tarjeta inválido', async () => {
      await expect(
        PaymentsService.addMethod('user123', {
          type: 'credit_card',
          cardNumber: '123',
        })
      ).rejects.toThrow('CARD_INVALID');
    });

    it('debería fallar con número de tarjeta muy corto', async () => {
      await expect(
        PaymentsService.addMethod('user123', {
          type: 'credit_card',
          cardNumber: '12345678901',
        })
      ).rejects.toThrow('CARD_INVALID');
    });
  });

  describe('setDefault', () => {
    it('debería establecer método por defecto exitosamente', async () => {
      const mockMethod = {
        id: 'method1',
        isDefault: false,
        save: jest.fn().mockResolvedValue(true),
      };
      (PaymentMethodModel.findOne as jest.Mock).mockResolvedValue(mockMethod);
      (PaymentMethodModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await PaymentsService.setDefault('user123', 'method1');

      expect(result).toEqual({ ok: true });
      expect(mockMethod.isDefault).toBe(true);
      expect(mockMethod.save).toHaveBeenCalled();
    });

    it('debería fallar si método no existe', async () => {
      (PaymentMethodModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(PaymentsService.setDefault('user123', 'method999')).rejects.toThrow('PAYMENT_METHOD_NOT_FOUND');
    });
  });

  describe('removeMethod', () => {
    it('debería eliminar método exitosamente', async () => {
      const mockMethod = { id: 'method1' };
      (PaymentMethodModel.findOne as jest.Mock).mockResolvedValue(mockMethod);
      (PaymentMethodModel.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const result = await PaymentsService.removeMethod('user123', 'method1');

      expect(result).toEqual({ ok: true });
      expect(PaymentMethodModel.deleteOne).toHaveBeenCalled();
    });

    it('debería fallar si método no existe', async () => {
      (PaymentMethodModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(PaymentsService.removeMethod('user123', 'method999')).rejects.toThrow('PAYMENT_METHOD_NOT_FOUND');
    });
  });

  describe('getDefaultMethod', () => {
    it('debería obtener método por defecto exitosamente', async () => {
      const mockMethod = { id: 'method1', isDefault: true };
      (PaymentMethodModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockMethod),
      });

      const result = await PaymentsService.getDefaultMethod('user123');

      expect(result).toEqual(mockMethod);
    });

    it('debería retornar null si no hay método por defecto', async () => {
      (PaymentMethodModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await PaymentsService.getDefaultMethod('user123');

      expect(result).toBeNull();
    });
  });

  describe('createPaymentIntent', () => {
    it('debería crear intent de pago exitosamente', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user123',
        status: 'PENDIENTE',
        totalCents: 10000,
      };
      const mockIntent = {
        id: 'intent1',
        orderId: 'ORD-123',
        toJSON: jest.fn().mockReturnValue({ id: 'intent1' }),
      };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);
      (PaymentIntentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (PaymentIntentModel.create as jest.Mock).mockResolvedValue(mockIntent);

      const result = await PaymentsService.createPaymentIntent({
        userId: 'user123',
        orderId: 'ORD-123',
        method: 'card',
      });

      expect(result).toBeDefined();
      expect(PaymentIntentModel.create).toHaveBeenCalled();
    });

    it('debería retornar intent existente si ya existe', async () => {
      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user123',
        status: 'PENDIENTE',
      };
      const mockExistingIntent = { id: 'intent1', orderId: 'ORD-123' };
      (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);
      (PaymentIntentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExistingIntent),
      });

      const result = await PaymentsService.createPaymentIntent({
        userId: 'user123',
        orderId: 'ORD-123',
      });

      expect(result).toEqual(mockExistingIntent);
      expect(PaymentIntentModel.create).not.toHaveBeenCalled();
    });

    it('debería fallar si orden no existe', async () => {
      (OrderModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        PaymentsService.createPaymentIntent({
          userId: 'user123',
          orderId: 'ORD-999',
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
      (PaymentIntentModel.findOne as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        PaymentsService.createPaymentIntent({
          userId: 'user123',
          orderId: 'ORD-123',
        })
      ).rejects.toThrow('ORDER_NOT_PENDING');
    });
  });

  describe('confirmCardPayment', () => {
    it('debería confirmar pago con tarjeta exitosamente', async () => {
      const mockIntent = {
        id: 'intent1',
        orderId: 'ORD-123',
        status: 'requires_confirmation',
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ id: 'intent1', status: 'succeeded' }),
      };
      const mockOrder = {
        orderId: 'ORD-123',
        paymentStatus: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      (PaymentIntentModel.findOne as jest.Mock).mockResolvedValue(mockIntent);
      (OrderModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await PaymentsService.confirmCardPayment('user123', 'intent1', true);

      expect(result).toBeDefined();
      expect(mockIntent.status).toBe('succeeded');
      expect(OrderModel.updateOne).toHaveBeenCalled();
    });

    it('debería marcar pago como fallido', async () => {
      const mockIntent = {
        id: 'intent1',
        orderId: 'ORD-123',
        status: 'requires_confirmation',
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ id: 'intent1', status: 'failed' }),
      };
      (PaymentIntentModel.findOne as jest.Mock).mockResolvedValue(mockIntent);
      (OrderModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      const result = await PaymentsService.confirmCardPayment('user123', 'intent1', false);

      expect(result).toBeDefined();
      expect(mockIntent.status).toBe('failed');
    });

    it('debería fallar si intent no existe', async () => {
      (PaymentIntentModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(PaymentsService.confirmCardPayment('user123', 'intent999', true)).rejects.toThrow('INTENT_NOT_FOUND');
    });

    it('debería fallar si intent no está en estado requires_confirmation', async () => {
      const mockIntent = {
        id: 'intent1',
        orderId: 'ORD-123',
        status: 'pending',
      };
      (PaymentIntentModel.findOne as jest.Mock).mockResolvedValue(mockIntent);

      await expect(PaymentsService.confirmCardPayment('user123', 'intent1', true)).rejects.toThrow('INVALID_INTENT_STATE');
    });
  });
});

