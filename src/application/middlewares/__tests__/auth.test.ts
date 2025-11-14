import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import {
  requireAuth,
  requireRole,
  requireAnyRole,
  requireSelfOrAdmin,
  requireVerifiedEmail,
  requireCustomerWithVerifiedEmail,
  AuthReq,
} from '../auth';

// Mock jwt
jest.mock('jsonwebtoken');

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middlewares', () => {
  let mockReq: Partial<AuthReq>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('debería pasar con token válido', () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };
      mockJwt.verify.mockReturnValue({
        sub: '12345678',
        role: 'customer',
        emailVerified: true,
      } as any);

      requireAuth(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockReq.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería fallar sin token', () => {
      mockReq.headers = {};

      requireAuth(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'NO_AUTH_HEADER' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería fallar con token expirado', () => {
      const token = 'expired-token';
      mockReq.headers = { authorization: `Bearer ${token}` };
      const expiredError = new TokenExpiredError('Token expired', new Date());
      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      requireAuth(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'TOKEN_EXPIRED' });
    });

    it('debería fallar con token inválido', () => {
      const token = 'invalid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };
      const invalidError = new JsonWebTokenError('Invalid token');
      mockJwt.verify.mockImplementation(() => {
        throw invalidError;
      });

      requireAuth(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'INVALID_TOKEN' });
    });
  });

  describe('requireRole', () => {
    it('debería pasar con rol correcto', () => {
      mockReq.user = { sub: '12345678', role: 'admin', emailVerified: true };
      const middleware = requireRole('admin');

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería fallar sin usuario', () => {
      mockReq.user = undefined;
      const middleware = requireRole('admin');

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('debería fallar con rol incorrecto', () => {
      mockReq.user = { sub: '12345678', role: 'customer', emailVerified: true };
      const middleware = requireRole('admin');

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'FORBIDDEN' });
    });
  });

  describe('requireAnyRole', () => {
    it('debería pasar con uno de los roles permitidos', () => {
      mockReq.user = { sub: '12345678', role: 'customer', emailVerified: true };
      const middleware = requireAnyRole(['customer', 'admin']);

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería fallar sin usuario', () => {
      mockReq.user = undefined;
      const middleware = requireAnyRole(['customer', 'admin']);

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('debería fallar con rol no permitido', () => {
      mockReq.user = { sub: '12345678', role: 'customer', emailVerified: true };
      const middleware = requireAnyRole(['admin']);

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'FORBIDDEN' });
    });
  });

  describe('requireSelfOrAdmin', () => {
    it('debería pasar si es el mismo usuario', () => {
      mockReq.user = { sub: '12345678', role: 'customer', emailVerified: true };
      mockReq.params = { id: '12345678' };
      const middleware = requireSelfOrAdmin();

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería pasar si es admin', () => {
      mockReq.user = { sub: '99999999', role: 'admin', emailVerified: true };
      mockReq.params = { id: '12345678' };
      const middleware = requireSelfOrAdmin();

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería fallar sin usuario', () => {
      mockReq.user = undefined;
      mockReq.params = { id: '12345678' };
      const middleware = requireSelfOrAdmin();

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('debería fallar si no es el mismo usuario ni admin', () => {
      mockReq.user = { sub: '11111111', role: 'customer', emailVerified: true };
      mockReq.params = { id: '12345678' };
      const middleware = requireSelfOrAdmin();

      middleware(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'FORBIDDEN' });
    });
  });

  describe('requireVerifiedEmail', () => {
    it('debería pasar con email verificado', () => {
      mockReq.user = { sub: '12345678', role: 'customer', emailVerified: true };

      requireVerifiedEmail(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería fallar sin usuario', () => {
      mockReq.user = undefined;

      requireVerifiedEmail(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'UNAUTHORIZED' });
    });

    it('debería fallar con email no verificado', () => {
      mockReq.user = { sub: '12345678', role: 'customer', emailVerified: false };

      requireVerifiedEmail(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Debes verificar tu email antes de realizar compras',
        action: 'verify_email_required',
      });
    });
  });

  describe('requireCustomerWithVerifiedEmail', () => {
    it('debería pasar con customer y email verificado', () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };
      mockJwt.verify.mockReturnValue({
        sub: '12345678',
        role: 'customer',
        emailVerified: true,
      } as any);

      requireCustomerWithVerifiedEmail(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería fallar sin token', () => {
      mockReq.headers = {};

      requireCustomerWithVerifiedEmail(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'NO_AUTH_HEADER' });
    });

    it('debería fallar si no es customer', () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };
      mockJwt.verify.mockReturnValue({
        sub: '12345678',
        role: 'admin',
        emailVerified: true,
      } as any);

      requireCustomerWithVerifiedEmail(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'FORBIDDEN',
        message: 'Solo usuarios customer pueden realizar compras',
      });
    });

    it('debería fallar con email no verificado', () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };
      mockJwt.verify.mockReturnValue({
        sub: '12345678',
        role: 'customer',
        emailVerified: false,
      } as any);

      requireCustomerWithVerifiedEmail(mockReq as AuthReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Debes verificar tu email antes de realizar compras',
        action: 'verify_email_required',
        resendUrl: '/api/v1/users/resend-verification',
      });
    });
  });
});

