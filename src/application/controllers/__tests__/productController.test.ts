import { Request, Response, NextFunction } from 'express';
import { productService } from '../../../domain/services/productService';
import { productController } from '../productController';

jest.mock('../../../domain/services/productService');

const mockProductService = productService as jest.Mocked<typeof productService>;

describe('ProductController', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    mockRes = {
      send: mockSend,
    };
    mockNext = jest.fn();
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: {},
    };
    jest.clearAllMocks();
  });

  describe('getAllProducts', () => {
    it('debería obtener todos los productos como admin', async () => {
      const mockProducts = [{ id: 'prod1', name: 'Product 1' }];
      mockProductService.getAllProducts.mockResolvedValue(mockProducts as any);
      mockReq.user = { role: 'admin' } as any;

      await productController.getAllProducts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProductService.getAllProducts).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(mockProducts);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería obtener productos para customer', async () => {
      const mockProducts = [{ id: 'prod1', name: 'Product 1' }];
      mockProductService.getAllProductsCustomer.mockResolvedValue(mockProducts as any);
      mockReq.user = { role: 'customer' } as any;

      await productController.getAllProducts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProductService.getAllProductsCustomer).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(mockProducts);
    });

    it('debería manejar errores', async () => {
      const error = new Error('Database error');
      mockProductService.getAllProducts.mockRejectedValue(error);
      mockReq.user = { role: 'admin' } as any;

      await productController.getAllProducts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getByIdProduct', () => {
    it('debería obtener producto por ID como admin', async () => {
      const mockProduct = { id: 'prod1', name: 'Product 1' };
      mockProductService.getByIdProduct.mockResolvedValue(mockProduct as any);
      mockReq.params = { id: 'prod1' };
      mockReq.user = { role: 'admin' } as any;

      await productController.getByIdProduct(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProductService.getByIdProduct).toHaveBeenCalledWith('prod1');
      expect(mockSend).toHaveBeenCalledWith(mockProduct);
    });

    it('debería obtener producto por ID como customer', async () => {
      const mockProduct = { id: 'prod1', name: 'Product 1' };
      mockProductService.getByIdProductCustomer.mockResolvedValue(mockProduct as any);
      mockReq.params = { id: 'prod1' };
      mockReq.user = { role: 'customer' } as any;

      await productController.getByIdProduct(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProductService.getByIdProductCustomer).toHaveBeenCalledWith('prod1');
      expect(mockSend).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe('createProduct', () => {
    it('debería crear producto exitosamente', async () => {
      const mockProduct = { id: 'prod1', name: 'New Product' };
      mockProductService.createProduct.mockResolvedValue(mockProduct as any);
      mockReq.body = { name: 'New Product', price: 1000 };

      await productController.createProduct(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProductService.createProduct).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe('updateProduct', () => {
    it('debería actualizar producto exitosamente', async () => {
      const mockProduct = { id: 'prod1', name: 'Updated Product' };
      mockProductService.updateProduct.mockResolvedValue(mockProduct as any);
      mockReq.params = { id: 'prod1' };
      mockReq.body = { name: 'Updated Product' };

      await productController.updateProduct(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProductService.updateProduct).toHaveBeenCalledWith('prod1', mockReq.body);
      expect(mockSend).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe('deleteProduct', () => {
    it('debería eliminar producto exitosamente', async () => {
      mockProductService.deleteProduct.mockResolvedValue({ ok: true } as any);
      mockReq.params = { id: 'prod1' };

      await productController.deleteProduct(mockReq as Request, mockRes as Response, mockNext);

      expect(mockProductService.deleteProduct).toHaveBeenCalledWith('prod1');
      expect(mockSend).toHaveBeenCalled();
    });
  });
});

