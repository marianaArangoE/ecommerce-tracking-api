import request from 'supertest';
import express from 'express';
import userRoutes from '../../../../../src/domain/models/users/routes';
import * as UserSvc from '../../../../../src/domain/services/userService';
import { validate } from '../../../../../src/application/middlewares/validate';
import { requireAuth } from '../../../../../src/application/middlewares/auth';

// Mock de las dependencias
jest.mock('../../../../../src/domain/models/users/service');
jest.mock('../../../../../src/application/middlewares/validate');
jest.mock('../../../../../src/application/middlewares/auth');

const mockUserSvc = UserSvc as jest.Mocked<typeof UserSvc>;
const mockValidate = validate as jest.MockedFunction<typeof validate>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

// Crear app de Express para pruebas
const app = express();
app.use(express.json());
app.use('/users', userRoutes);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configurar mocks para que pasen por defecto
    mockValidate.mockImplementation((req, res, next) => next());
    mockRequireAuth.mockImplementation((req, res, next) => {
      req.user = { sub: '12345678', role: 'customer', emailVerified: true };
      next();
    });
  });

  describe('POST /users/register', () => {
    it('debería registrar un usuario exitosamente', async () => {
      const userData = {
        cc: '12345678',
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer'
      };

      const mockUser = {
        id: '12345678',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        addresses: []
      };

      mockUserSvc.register.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/users/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual(mockUser);
      expect(mockUserSvc.register).toHaveBeenCalledWith({
        cc: userData.cc,
        email: userData.email,
        password: userData.password,
        name: userData.name,
        phone: userData.phone,
        role: userData.role
      });
    });

    it('debería manejar errores de registro', async () => {
      const userData = {
        cc: '12345678',
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        role: 'customer'
      };

      const error = new Error('EMAIL_TAKEN') as any;
      error.status = 409;
      mockUserSvc.register.mockRejectedValue(error);

      const response = await request(app)
        .post('/users/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('EMAIL_TAKEN');
    });
  });

  describe('POST /users/login', () => {
    it('debería hacer login exitosamente', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'Password123'
      };

      const mockResult = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: '12345678',
          email: 'test@example.com',
          name: 'Test User',
          phone: '1234567890',
          role: 'customer',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          addresses: []
        }
      };

      mockUserSvc.login.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockUserSvc.login).toHaveBeenCalledWith(loginData);
    });

    it('debería manejar credenciales inválidas', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'wrong-password'
      };

      const error = new Error('INVALID_CREDENTIALS') as any;
      error.status = 401;
      mockUserSvc.login.mockRejectedValue(error);

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /users', () => {
    it('debería listar usuarios', async () => {
      const mockUsers = {
        items: [
          {
            id: '12345678',
            email: 'user1@example.com',
            name: 'User 1',
            phone: '1234567890',
            role: 'customer',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            addresses: []
          }
        ],
        total: 1
      };

      mockUserSvc.list.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.body).toEqual(mockUsers);
      expect(mockUserSvc.list).toHaveBeenCalled();
    });
  });

  describe('GET /users/me', () => {
    it('debería obtener perfil del usuario autenticado', async () => {
      const mockUser = {
        id: '12345678',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        addresses: []
      };

      mockUserSvc.getMe.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/me')
        .expect(200);

      expect(response.body).toEqual(mockUser);
      expect(mockUserSvc.getMe).toHaveBeenCalledWith('12345678');
    });
  });

  describe('GET /users/:id', () => {
    it('debería obtener usuario por ID', async () => {
      const mockUser = {
        id: '12345678',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        addresses: []
      };

      mockUserSvc.getById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/12345678')
        .expect(200);

      expect(response.body).toEqual(mockUser);
      expect(mockUserSvc.getById).toHaveBeenCalledWith('12345678');
    });

    it('debería manejar usuario no encontrado', async () => {
      const error = new Error('USER_NOT_FOUND') as any;
      error.status = 404;
      mockUserSvc.getById.mockRejectedValue(error);

      const response = await request(app)
        .get('/users/99999999')
        .expect(404);

      expect(response.body.error).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /users/verify-email', () => {
    it('debería verificar email exitosamente', async () => {
      const token = 'valid-verification-token';
      const mockUser = {
        id: '12345678',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        addresses: []
      };

      mockUserSvc.verifyEmail.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/users/verify-email')
        .send({ token })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Email verificado exitosamente',
        user: mockUser
      });
      expect(mockUserSvc.verifyEmail).toHaveBeenCalledWith(token);
    });

    it('debería manejar token inválido', async () => {
      const token = 'invalid-token';
      const error = new Error('INVALID_OR_EXPIRED_TOKEN') as any;
      error.status = 400;
      mockUserSvc.verifyEmail.mockRejectedValue(error);

      const response = await request(app)
        .post('/users/verify-email')
        .send({ token })
        .expect(400);

      expect(response.body.error).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });

  describe('GET /users/verify-email', () => {
    it('debería verificar email con token en query params', async () => {
      const token = 'valid-verification-token';
      const mockUser = {
        id: '12345678',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        addresses: []
      };

      mockUserSvc.verifyEmail.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/users/verify-email?token=${token}`)
        .expect(200);

      expect(response.text).toContain('¡Email Verificado!');
      expect(response.text).toContain('test@example.com');
      expect(mockUserSvc.verifyEmail).toHaveBeenCalledWith(token);
    });

    it('debería manejar token faltante en query params', async () => {
      const response = await request(app)
        .get('/users/verify-email')
        .expect(400);

      expect(response.text).toContain('Error de Verificación');
      expect(response.text).toContain('Token de verificación no válido o faltante');
    });

    it('debería manejar token inválido en query params', async () => {
      const token = 'invalid-token';
      const error = new Error('INVALID_OR_EXPIRED_TOKEN') as any;
      error.status = 400;
      mockUserSvc.verifyEmail.mockRejectedValue(error);

      const response = await request(app)
        .get(`/users/verify-email?token=${token}`)
        .expect(400);

      expect(response.text).toContain('Error de Verificación');
      expect(response.text).toContain('El token ha expirado o no es válido');
    });
  });

  describe('POST /users/resend-verification', () => {
    it('debería reenviar email de verificación exitosamente', async () => {
      const mockResult = { message: 'Verification email sent successfully' };
      mockUserSvc.resendVerificationEmail.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/users/resend-verification')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockUserSvc.resendVerificationEmail).toHaveBeenCalledWith('12345678');
    });

    it('debería manejar error al reenviar verificación', async () => {
      const error = new Error('EMAIL_ALREADY_VERIFIED') as any;
      error.status = 400;
      mockUserSvc.resendVerificationEmail.mockRejectedValue(error);

      const response = await request(app)
        .post('/users/resend-verification')
        .expect(400);

      expect(response.body.error).toBe('EMAIL_ALREADY_VERIFIED');
    });
  });
});