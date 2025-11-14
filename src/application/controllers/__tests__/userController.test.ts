import { Request, Response } from 'express';
import { AuthReq } from '../../middlewares/auth';
import * as UserSvc from '../../../domain/services/userService';
import * as UserController from '../userController';

jest.mock('../../../domain/services/userService');

const mockUserSvc = UserSvc as jest.Mocked<typeof UserSvc>;

describe('UserController', () => {
  let mockReq: Partial<AuthReq>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockSend = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson, send: mockSend });
    mockRes = {
      status: mockStatus,
      json: mockJson,
      send: mockSend,
    };
    mockReq = {
      user: { sub: '12345678', role: 'customer', emailVerified: true },
      body: {},
      params: {},
      query: {},
    };
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debería hacer login exitosamente', async () => {
      const mockResult = {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '12345678', email: 'test@example.com' },
      };
      mockUserSvc.login.mockResolvedValue(mockResult as any);
      mockReq.body = { identifier: 'test@example.com', password: 'Password123' };

      await UserController.login(mockReq as Request, mockRes as Response);

      expect(mockUserSvc.login).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'Password123',
      });
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('debería manejar errores con status personalizado', async () => {
      const error: any = new Error('INVALID_CREDENTIALS');
      error.status = 401;
      mockUserSvc.login.mockRejectedValue(error);
      mockReq.body = { identifier: 'test@example.com', password: 'wrong' };

      await UserController.login(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'INVALID_CREDENTIALS' });
    });

    it('debería usar status por defecto si no está definido', async () => {
      const error: any = new Error('LOGIN_ERROR');
      mockUserSvc.login.mockRejectedValue(error);
      mockReq.body = { identifier: 'test@example.com', password: 'wrong' };

      await UserController.login(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'LOGIN_ERROR' });
    });
  });

  describe('refresh', () => {
    it('debería refrescar token exitosamente', async () => {
      const mockResult = { accessToken: 'new-token', refreshToken: 'new-refresh' };
      mockUserSvc.refresh.mockResolvedValue(mockResult as any);
      mockReq.body = { refreshToken: 'old-refresh' };

      await UserController.refresh(mockReq as Request, mockRes as Response);

      expect(mockUserSvc.refresh).toHaveBeenCalledWith('old-refresh');
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('REFRESH_ERROR');
      error.status = 400;
      mockUserSvc.refresh.mockRejectedValue(error);
      mockReq.body = { refreshToken: 'invalid' };

      await UserController.refresh(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'REFRESH_ERROR' });
    });
  });

  describe('logout', () => {
    it('debería hacer logout exitosamente', async () => {
      mockUserSvc.logout.mockResolvedValue({ ok: true } as any);
      mockReq.body = { refreshToken: 'refresh-token' };

      await UserController.logout(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.logout).toHaveBeenCalledWith('12345678', 'refresh-token');
      expect(mockJson).toHaveBeenCalledWith({ ok: true });
    });

    it('debería usar userId del body si no hay user', async () => {
      mockReq.user = undefined;
      mockReq.body = { refreshToken: 'refresh-token', userId: '99999999' };
      mockUserSvc.logout.mockResolvedValue({ ok: true } as any);

      await UserController.logout(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.logout).toHaveBeenCalledWith('99999999', 'refresh-token');
    });
  });

  describe('getAddresses', () => {
    it('debería obtener direcciones exitosamente', async () => {
      const mockAddresses = [{ id: 'addr1', city: 'Medellín' }];
      mockUserSvc.getAddresses.mockResolvedValue(mockAddresses as any);

      await UserController.getAddresses(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.getAddresses).toHaveBeenCalledWith('12345678');
      expect(mockJson).toHaveBeenCalledWith({ addresses: mockAddresses });
    });
  });

  describe('getMe', () => {
    it('debería obtener perfil exitosamente', async () => {
      const mockUser = { id: '12345678', email: 'test@example.com' };
      mockUserSvc.getMe.mockResolvedValue(mockUser as any);

      await UserController.getMe(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.getMe).toHaveBeenCalledWith('12345678');
      expect(mockJson).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('updateMe', () => {
    it('debería actualizar perfil exitosamente', async () => {
      const mockUser = { id: '12345678', name: 'Updated Name' };
      mockUserSvc.updateMe.mockResolvedValue(mockUser as any);
      mockReq.body = { name: 'Updated Name', phone: '1234567890' };

      await UserController.updateMe(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.updateMe).toHaveBeenCalledWith('12345678', {
        name: 'Updated Name',
        phone: '1234567890',
        password: undefined,
      });
      expect(mockJson).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('addAddress', () => {
    it('debería agregar dirección exitosamente', async () => {
      const mockAddresses = [{ id: 'addr1', city: 'Medellín' }];
      mockUserSvc.addAddress.mockResolvedValue(mockAddresses as any);
      mockReq.body = { id: 'addr1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' };

      await UserController.addAddress(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.addAddress).toHaveBeenCalledWith('12345678', mockReq.body);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({ addresses: mockAddresses });
    });
  });

  describe('updateAddress', () => {
    it('debería actualizar dirección exitosamente', async () => {
      const mockAddress = { id: 'addr1', city: 'Bogotá' };
      mockUserSvc.updateAddress.mockResolvedValue(mockAddress as any);
      mockReq.params = { id: 'addr1' };
      mockReq.body = { city: 'Bogotá' };

      await UserController.updateAddress(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.updateAddress).toHaveBeenCalledWith('12345678', 'addr1', { city: 'Bogotá' });
      expect(mockJson).toHaveBeenCalledWith({ address: mockAddress });
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('ADDRESS_NOT_FOUND');
      error.status = 404;
      mockUserSvc.updateAddress.mockRejectedValue(error);
      mockReq.params = { id: 'addr999' };
      mockReq.body = { city: 'Bogotá' };

      await UserController.updateAddress(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'ADDRESS_NOT_FOUND' });
    });
  });

  describe('removeAddress', () => {
    it('debería eliminar dirección exitosamente', async () => {
      const mockAddresses = [];
      mockUserSvc.removeAddress.mockResolvedValue(mockAddresses as any);
      mockReq.params = { id: 'addr1' };

      await UserController.removeAddress(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.removeAddress).toHaveBeenCalledWith('12345678', 'addr1');
      expect(mockJson).toHaveBeenCalledWith({ addresses: mockAddresses });
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('ADDRESS_NOT_FOUND');
      error.status = 404;
      mockUserSvc.removeAddress.mockRejectedValue(error);
      mockReq.params = { id: 'addr999' };

      await UserController.removeAddress(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'ADDRESS_NOT_FOUND' });
    });
  });

  describe('register', () => {
    it('debería registrar usuario exitosamente', async () => {
      const mockUser = { id: '12345678', email: 'new@example.com' };
      mockUserSvc.register.mockResolvedValue(mockUser as any);
      mockReq.body = {
        cc: '12345678',
        email: 'new@example.com',
        password: 'Password123',
        name: 'New User',
        role: 'customer',
      };

      await UserController.register(mockReq as Request, mockRes as Response);

      expect(mockUserSvc.register).toHaveBeenCalledWith({
        cc: '12345678',
        email: 'new@example.com',
        password: 'Password123',
        name: 'New User',
        phone: undefined,
        role: 'customer',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockUser);
    });

    it('debería trimear cc', async () => {
      const mockUser = { id: '12345678', email: 'new@example.com' };
      mockUserSvc.register.mockResolvedValue(mockUser as any);
      mockReq.body = {
        cc: '  12345678  ',
        email: 'new@example.com',
        password: 'Password123',
        name: 'New User',
        role: 'customer',
      };

      await UserController.register(mockReq as Request, mockRes as Response);

      expect(mockUserSvc.register).toHaveBeenCalledWith(
        expect.objectContaining({ cc: '12345678' })
      );
    });
  });

  describe('verifyEmail', () => {
    it('debería verificar email exitosamente', async () => {
      const mockUser = { id: '12345678', email: 'test@example.com', emailVerified: true };
      mockUserSvc.verifyEmail.mockResolvedValue(mockUser as any);
      mockReq.body = { token: 'verification-token' };

      await UserController.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockUserSvc.verifyEmail).toHaveBeenCalledWith('verification-token');
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Email verificado exitosamente',
        user: mockUser,
      });
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('INVALID_OR_EXPIRED_TOKEN');
      error.status = 400;
      mockUserSvc.verifyEmail.mockRejectedValue(error);
      mockReq.body = { token: 'invalid-token' };

      await UserController.verifyEmail(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'INVALID_OR_EXPIRED_TOKEN' });
    });
  });

  describe('verifyEmailPage', () => {
    it('debería verificar email con token válido', async () => {
      const mockUser = { id: '12345678', email: 'test@example.com' };
      mockUserSvc.verifyEmail.mockResolvedValue(mockUser as any);
      mockReq.query = { token: 'valid-token' };

      await UserController.verifyEmailPage(mockReq as Request, mockRes as Response);

      expect(mockUserSvc.verifyEmail).toHaveBeenCalledWith('valid-token');
      expect(mockSend).toHaveBeenCalled();
      const html = mockSend.mock.calls[0][0];
      expect(html).toContain('¡Email Verificado!');
      expect(html).toContain('test@example.com');
    });

    it('debería manejar token faltante', async () => {
      mockReq.query = {};

      await UserController.verifyEmailPage(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockSend).toHaveBeenCalled();
      const html = mockSend.mock.calls[0][0];
      expect(html).toContain('Error de Verificación');
    });

    it('debería manejar token inválido', async () => {
      const error: any = new Error('INVALID_OR_EXPIRED_TOKEN');
      error.status = 400;
      mockUserSvc.verifyEmail.mockRejectedValue(error);
      mockReq.query = { token: 'invalid-token' };

      await UserController.verifyEmailPage(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockSend).toHaveBeenCalled();
      const html = mockSend.mock.calls[0][0];
      expect(html).toContain('El token ha expirado o no es válido');
    });

    it('debería manejar otros errores', async () => {
      const error: any = new Error('UNKNOWN_ERROR');
      error.status = 500;
      mockUserSvc.verifyEmail.mockRejectedValue(error);
      mockReq.query = { token: 'token' };

      await UserController.verifyEmailPage(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      const html = mockSend.mock.calls[0][0];
      expect(html).toContain('Error al verificar el email');
    });
  });

  describe('resendVerification', () => {
    it('debería reenviar verificación exitosamente', async () => {
      const mockResult = { message: 'Email sent' };
      mockUserSvc.resendVerificationEmail.mockResolvedValue(mockResult as any);

      await UserController.resendVerification(mockReq as AuthReq, mockRes as Response);

      expect(mockUserSvc.resendVerificationEmail).toHaveBeenCalledWith('12345678');
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('debería manejar errores', async () => {
      const error: any = new Error('EMAIL_ALREADY_VERIFIED');
      error.status = 400;
      mockUserSvc.resendVerificationEmail.mockRejectedValue(error);

      await UserController.resendVerification(mockReq as AuthReq, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'EMAIL_ALREADY_VERIFIED' });
    });
  });

  describe('getById', () => {
    it('debería obtener usuario por ID exitosamente', async () => {
      const mockUser = { id: '12345678', email: 'test@example.com' };
      mockUserSvc.getById.mockResolvedValue(mockUser as any);
      mockReq.params = { id: '12345678' };

      await UserController.getById(mockReq as Request, mockRes as Response);

      expect(mockUserSvc.getById).toHaveBeenCalledWith('12345678');
      expect(mockJson).toHaveBeenCalledWith(mockUser);
    });

    it('debería manejar usuario no encontrado', async () => {
      const error: any = new Error('USER_NOT_FOUND');
      error.status = 404;
      mockUserSvc.getById.mockRejectedValue(error);
      mockReq.params = { id: '99999999' };

      await UserController.getById(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'USER_NOT_FOUND' });
    });
  });
});

