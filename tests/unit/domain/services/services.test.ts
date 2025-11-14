import * as Services from '../../../../src/domain/services/services';
import { ProductModel } from '../../../../src/domain/models/products/productModel';
import mongoose from 'mongoose';

jest.mock('../../../../src/domain/models/products/productModel', () => ({
  ProductModel: {
    updateOne: jest.fn(),
  },
}));
jest.mock('mongoose');

describe('Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('nowISO', () => {
    it('debería retornar fecha en formato ISO', () => {
      const result = Services.nowISO();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('debería retornar fecha válida', () => {
      const result = Services.nowISO();
      const date = new Date(result);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe('genOrderId', () => {
    it('debería generar ID de orden con formato correcto', () => {
      const date = new Date('2024-01-15');
      const orderId = Services.genOrderId(date);

      expect(orderId).toMatch(/^ORD-20240115-[A-Z0-9]{5}$/);
    });

    it('debería usar fecha actual si no se proporciona', () => {
      const orderId = Services.genOrderId();
      const today = new Date();
      const expectedPrefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-`;

      expect(orderId).toMatch(new RegExp(`^${expectedPrefix}[A-Z0-9]{5}$`));
    });

    it('debería generar IDs únicos', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(Services.genOrderId());
      }
      // Al menos algunos deberían ser únicos (aunque puede haber colisiones)
      expect(ids.size).toBeGreaterThan(1);
    });

    it('debería manejar diferentes fechas correctamente', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-12-31');
      const id1 = Services.genOrderId(date1);
      const id2 = Services.genOrderId(date2);

      expect(id1).toContain('20240101');
      expect(id2).toContain('20241231');
    });
  });

  describe('verifyAndReserve', () => {
    it('debería reservar stock exitosamente con transacción', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn(),
      };

      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (ProductModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      await Services.verifyAndReserve([
        { productId: 'prod1', quantity: 2 },
        { productId: 'prod2', quantity: 3 },
      ]);

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(ProductModel.updateOne).toHaveBeenCalledTimes(2);
    });

    it('debería fallar si producto no tiene stock suficiente', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn(),
      };

      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (ProductModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      await expect(
        Services.verifyAndReserve([{ productId: 'prod1', quantity: 10 }])
      ).rejects.toThrow('OUT_OF_STOCK:prod1');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('debería hacer rollback si falla en medio de la reserva', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn(),
      };

      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (ProductModel.updateOne as jest.Mock)
        .mockResolvedValueOnce({ modifiedCount: 1 })
        .mockResolvedValueOnce({ modifiedCount: 0 });

      await expect(
        Services.verifyAndReserve([
          { productId: 'prod1', quantity: 2 },
          { productId: 'prod2', quantity: 3 },
        ])
      ).rejects.toThrow('OUT_OF_STOCK:prod2');

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it('debería usar fallback sin transacción si falla por Transaction', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn(),
      };

      const transactionError = new Error('Transaction numbers are only allowed');
      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (ProductModel.updateOne as jest.Mock)
        .mockRejectedValueOnce(transactionError)
        .mockResolvedValue({ modifiedCount: 1 });

      await Services.verifyAndReserve([{ productId: 'prod1', quantity: 2 }]);

      // Debería llamar al fallback sin transacción
      expect(ProductModel.updateOne).toHaveBeenCalledTimes(2);
    });

    it('debería usar fallback sin transacción si falla por NoSuchTransaction', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn(),
      };

      const transactionError: any = new Error('No transaction');
      transactionError.code = 'NoSuchTransaction';
      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (ProductModel.updateOne as jest.Mock)
        .mockRejectedValueOnce(transactionError)
        .mockResolvedValue({ modifiedCount: 1 });

      await Services.verifyAndReserve([{ productId: 'prod1', quantity: 2 }]);

      expect(ProductModel.updateOne).toHaveBeenCalledTimes(2);
    });

    it('debería hacer rollback manual en fallback si falla', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn(),
      };

      const transactionError = new Error('Transaction numbers are only allowed');
      (mongoose.startSession as jest.Mock).mockResolvedValue(mockSession);
      (ProductModel.updateOne as jest.Mock)
        .mockRejectedValueOnce(transactionError)
        .mockResolvedValueOnce({ modifiedCount: 1 }) // Primera reserva exitosa
        .mockResolvedValueOnce({ modifiedCount: 0 }); // Segunda falla

      await expect(
        Services.verifyAndReserve([
          { productId: 'prod1', quantity: 2 },
          { productId: 'prod2', quantity: 3 },
        ])
      ).rejects.toThrow('OUT_OF_STOCK:prod2');

      // Debería hacer rollback de prod1
      expect(ProductModel.updateOne).toHaveBeenCalledWith(
        { _id: 'prod1' },
        { $inc: { stock: 2 } }
      );
    });
  });

  describe('returnStock', () => {
    it('debería devolver stock exitosamente', async () => {
      (ProductModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      await Services.returnStock([
        { productId: 'prod1', quantity: 2 },
        { productId: 'prod2', quantity: 3 },
      ]);

      expect(ProductModel.updateOne).toHaveBeenCalledTimes(2);
      expect(ProductModel.updateOne).toHaveBeenCalledWith(
        { _id: 'prod1' },
        { $inc: { stock: 2 } },
        {}
      );
    });

    it('debería devolver stock con sesión', async () => {
      const mockSession = {} as any;
      (ProductModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      await Services.returnStock(
        [{ productId: 'prod1', quantity: 2 }],
        mockSession
      );

      expect(ProductModel.updateOne).toHaveBeenCalledWith(
        { _id: 'prod1' },
        { $inc: { stock: 2 } },
        { session: mockSession }
      );
    });

    it('debería manejar múltiples productos', async () => {
      (ProductModel.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      await Services.returnStock([
        { productId: 'prod1', quantity: 5 },
        { productId: 'prod2', quantity: 10 },
        { productId: 'prod3', quantity: 1 },
      ]);

      expect(ProductModel.updateOne).toHaveBeenCalledTimes(3);
    });
  });
});
