import request from 'supertest';
import express from 'express';
import * as UserSvc from '../../../../../src/domain/services/userService';
import { boomErrorHandler, genericErrorHandler } from '../../../../../src/application/middlewares/errorHandle';

// Mock de las dependencias ANTES de importar las rutas
jest.mock('../../../../../src/domain/services/userService');
jest.mock('../../../../../src/application/middlewares/validatorHandler', () => ({
  schemaValidator: jest.fn(() => (req: any, res: any, next: any) => next())
}));
jest.mock('../../../../../src/application/middlewares/auth', () => ({
  requireAuth: jest.fn((req: any, res: any, next: any) => {
    req.user = { sub: '12345678', role: 'customer', emailVerified: true };
    next();
  }),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireAnyRole: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

// Ahora importar las rutas después de configurar los mocks
import { userRouter as userRoutes } from '../../../../../src/application/routes/userRoutes';
import { requireAuth } from '../../../../../src/application/middlewares/auth';

const mockUserSvc = UserSvc as jest.Mocked<typeof UserSvc>;
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

// Crear app de Express para pruebas
const app = express();
app.use(express.json());
app.use('/users', userRoutes);
app.use(boomErrorHandler);
app.use(genericErrorHandler);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Los mocks ya están configurados en jest.mock, solo necesitamos limpiar las llamadas
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

      const error: any = new Error('INVALID_CREDENTIALS');
      error.status = 401;
      mockUserSvc.login.mockRejectedValue(error);

      const response = await request(app)
        .post('/users/login')
        .send(loginData);

      // El controlador debería manejar el error y retornar el status correcto
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });
  });

  // Nota: No hay ruta GET /users para listar todos los usuarios
  // Solo existe GET /users/:id para obtener un usuario específico

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