import { register, login, refresh, logout, getById, updateMe, verifyEmail, resendVerificationEmail, generateAndSendVerificationToken, getAddresses, addAddress, updateAddress, removeAddress, getMe } from '../../../../../src/domain/services/userService';
import { UserModel } from '../../../../../src/domain/models/users/userModel';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock de las dependencias
jest.mock('../../../../../src/domain/models/users/userModel');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../../../../src/domain/services/emailService', () => ({
  generateVerificationToken: jest.fn(() => 'mock-token'),
  sendVerificationEmail: jest.fn()
}));

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configurar variables de entorno para las pruebas
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  describe('register', () => {
    it('debería registrar un usuario exitosamente', async () => {
      // Arrange
      const userData = {
        cc: '12345678',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer' as const
      };

      const mockUser = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        addresses: [],
        failedLoginCount: 0,
        lockUntil: null,
        refreshTokens: []
      };

      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findById.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser as any);
      mockBcrypt.hash.mockResolvedValue('hashed-password' as never);

      // Act
      const result = await register(userData);

      // Assert
      expect(result).toEqual({
        id: '12345678',
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: false,
        createdAt: mockUser.createdAt,
        addresses: []
      });
      expect(mockUserModel.create).toHaveBeenCalledWith({
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: false,
        createdAt: expect.any(String),
        addresses: [],
        failedLoginCount: 0,
        lockUntil: null,
        refreshTokens: []
      });
    });

    it('debería lanzar error si el email ya existe', async () => {
      // Arrange
      const userData = {
        cc: '12345678',
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'customer' as const
      };

      mockUserModel.findOne.mockResolvedValue({ _id: 'existing-user' } as any);

      // Act & Assert
      await expect(register(userData)).rejects.toMatchObject({
        message: 'EMAIL_TAKEN',
        status: 409
      });
    });

    it('debería lanzar error si la cédula ya existe', async () => {
      // Arrange
      const userData = {
        cc: '12345678',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'customer' as const
      };

      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.findById.mockResolvedValue({ _id: '12345678' } as any);

      // Act & Assert
      await expect(register(userData)).rejects.toMatchObject({
        message: 'CC_ALREADY_EXISTS',
        status: 409
      });
    });
  });

  describe('login', () => {
    it('debería hacer login exitosamente con email', async () => {
      // Arrange
      const loginData = {
        identifier: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'customer',
        emailVerified: true,
        failedLoginCount: 0,
        lockUntil: null,
        refreshTokens: [],
        save: jest.fn()
      };

      mockUserModel.findOne.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('mock-token' as never);

      // Act
      const result = await login(loginData);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('debería lanzar error si las credenciales son inválidas', async () => {
      // Arrange
      const loginData = {
        identifier: 'test@example.com',
        password: 'wrong-password'
      };

      const mockUser = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'customer',
        emailVerified: true,
        failedLoginCount: 0,
        lockUntil: null,
        refreshTokens: [],
        save: jest.fn()
      };

      mockUserModel.findOne.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(login(loginData)).rejects.toMatchObject({
        message: 'INVALID_CREDENTIALS',
        status: 401
      });
    });

    it('debería lanzar error si la cuenta está bloqueada', async () => {
      // Arrange
      const loginData = {
        identifier: 'test@example.com',
        password: 'password123'
      };

      const futureDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos en el futuro
      const mockUser = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        role: 'customer',
        emailVerified: true,
        failedLoginCount: 0,
        lockUntil: futureDate,
        refreshTokens: []
      };

      mockUserModel.findOne.mockResolvedValue(mockUser as any);

      // Act & Assert
      await expect(login(loginData)).rejects.toMatchObject({
        message: 'ACCOUNT_LOCKED',
        status: 423
      });
    });
  });

  describe('refresh', () => {
    it('debería refrescar tokens exitosamente', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { sub: '12345678', role: 'customer', emailVerified: true };
      const mockUser = {
        _id: '12345678',
        email: 'test@example.com',
        role: 'customer',
        emailVerified: true,
        refreshTokens: [{ token: refreshToken, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }],
        save: jest.fn()
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      mockUserModel.findById.mockResolvedValue(mockUser as any);
      mockJwt.sign.mockReturnValue('new-token' as never);

      // Act
      const result = await refresh(refreshToken);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('debería lanzar error si el refresh token es inválido', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(refresh(refreshToken)).rejects.toMatchObject({
        message: 'INVALID_REFRESH',
        status: 401
      });
    });
  });

  describe('logout', () => {
    it('debería hacer logout exitosamente', async () => {
      // Arrange
      const userId = '12345678';
      const refreshToken = 'refresh-token-to-remove';
      const mockUser = {
        _id: userId,
        refreshTokens: [
          { token: refreshToken, expiresAt: new Date() },
          { token: 'other-token', expiresAt: new Date() }
        ],
        save: jest.fn()
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      // Act
      const result = await logout(userId, refreshToken);

      // Assert
      expect(result).toEqual({ ok: true });
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.refreshTokens).toHaveLength(1);
      expect(mockUser.refreshTokens[0].token).toBe('other-token');
    });
  });

  describe('getById', () => {
    it('debería obtener usuario por ID exitosamente', async () => {
      // Arrange
      const userId = '12345678';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        addresses: []
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      // Act
      const result = await getById(userId);

      // Assert
      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: true,
        createdAt: mockUser.createdAt,
        addresses: []
      });
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      const userId = 'nonexistent';
      mockUserModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(getById(userId)).rejects.toMatchObject({
        message: 'USER_NOT_FOUND',
        status: 404
      });
    });
  });

  describe('updateMe', () => {
    it('debería actualizar perfil exitosamente', async () => {
      // Arrange
      const userId = '12345678';
      const updateData = {
        name: 'Updated Name',
        phone: '9876543210'
      };

      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Updated Name',
        phone: '9876543210',
        role: 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        addresses: []
      };

      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser as any);

      // Act
      const result = await updateMe(userId, updateData);

      // Assert
      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        name: 'Updated Name',
        phone: '9876543210',
        role: 'customer',
        emailVerified: true,
        createdAt: mockUser.createdAt,
        addresses: []
      });
    });
  });

  describe('verifyEmail', () => {
    it('debería verificar email exitosamente', async () => {
      // Arrange
      const token = 'valid-verification-token';
      const mockUser = {
        _id: '12345678',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date().toISOString(),
        addresses: [],
        save: jest.fn()
      };

      mockUserModel.findOne.mockResolvedValue(mockUser as any);

      // Act
      const result = await verifyEmail(token);

      // Assert
      expect(result).toEqual({
        id: '12345678',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
        emailVerified: true,
        createdAt: mockUser.createdAt,
        addresses: []
      });
      expect(mockUser.emailVerified).toBe(true);
      expect(mockUser.emailVerificationToken).toBeUndefined();
      expect(mockUser.emailVerificationExpires).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('debería lanzar error si el token es inválido', async () => {
      // Arrange
      const token = 'invalid-token';
      mockUserModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(verifyEmail(token)).rejects.toMatchObject({
        message: 'INVALID_OR_EXPIRED_TOKEN',
        status: 400
      });
    });

    it('debería lanzar error si el token ha expirado', async () => {
      // Arrange
      const token = 'expired-token';
      const mockUser = {
        _id: '12345678',
        emailVerificationToken: token,
        emailVerificationExpires: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expirado
      };

      mockUserModel.findOne.mockResolvedValue(null); // No encuentra porque está expirado

      // Act & Assert
      await expect(verifyEmail(token)).rejects.toMatchObject({
        message: 'INVALID_OR_EXPIRED_TOKEN',
        status: 400
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('debería reenviar email de verificación exitosamente', async () => {
      // Arrange
      const userId = '12345678';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
        save: jest.fn()
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      // Act
      const result = await resendVerificationEmail(userId);

      // Assert
      expect(result).toEqual({ message: 'Verification email sent successfully' });
      expect(mockUser.emailVerificationToken).toBeDefined();
      expect(mockUser.emailVerificationExpires).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      const userId = 'nonexistent';
      mockUserModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(resendVerificationEmail(userId)).rejects.toMatchObject({
        message: 'USER_NOT_FOUND',
        status: 404
      });
    });

    it('debería lanzar error si el email ya está verificado', async () => {
      // Arrange
      const userId = '12345678';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      // Act & Assert
      await expect(resendVerificationEmail(userId)).rejects.toMatchObject({
        message: 'EMAIL_ALREADY_VERIFIED',
        status: 400
      });
    });
  });

  describe('generateAndSendVerificationToken', () => {
    it('debería generar y enviar token de verificación exitosamente', async () => {
      // Arrange
      const userId = '12345678';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
        save: jest.fn()
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      // Act
      const result = await generateAndSendVerificationToken(userId);

      // Assert
      expect(result).toEqual({ message: 'Verification email sent successfully' });
      expect(mockUser.emailVerificationToken).toBeDefined();
      expect(mockUser.emailVerificationExpires).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('debería lanzar error si el usuario no existe', async () => {
      // Arrange
      const userId = 'nonexistent';
      mockUserModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(generateAndSendVerificationToken(userId)).rejects.toMatchObject({
        message: 'USER_NOT_FOUND',
        status: 404
      });
    });
  });

  describe('getMe', () => {
    it('debería obtener perfil del usuario exitosamente', async () => {
      const userId = '12345678';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        role: 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        addresses: [],
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      const result = await getMe(userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
    });

    it('debería fallar si usuario no existe', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(getMe('nonexistent')).rejects.toMatchObject({
        message: 'USER_NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('getAddresses', () => {
    it('debería obtener direcciones exitosamente', async () => {
      const userId = '12345678';
      const mockAddresses = [
        { id: 'addr1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' },
      ];
      const mockUser = {
        _id: userId,
        addresses: mockAddresses,
      };

      (mockUserModel.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const result = await getAddresses(userId);

      expect(result).toEqual(mockAddresses);
    });

    it('debería fallar con userId inválido', async () => {
      await expect(getAddresses('' as any)).rejects.toMatchObject({
        message: 'INVALID_USER_ID',
        status: 400,
      });
    });

    it('debería fallar si usuario no existe', async () => {
      (mockUserModel.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(getAddresses('nonexistent')).rejects.toMatchObject({
        message: 'USER_NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('addAddress', () => {
    it('debería agregar dirección exitosamente', async () => {
      const userId = '12345678';
      const newAddress = {
        id: 'addr1',
        city: 'Medellín',
        postalCode: '050001',
        address: 'Calle 1',
      };
      const mockUser = {
        _id: userId,
        addresses: [],
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      const result = await addAddress(userId, newAddress);

      expect(result).toContainEqual(newAddress);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('debería fallar con userId inválido', async () => {
      await expect(
        addAddress('' as any, { id: 'addr1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' })
      ).rejects.toMatchObject({
        message: 'INVALID_USER_ID',
        status: 400,
      });
    });

    it('debería fallar con datos de dirección inválidos', async () => {
      await expect(
        addAddress('12345678', null as any)
      ).rejects.toMatchObject({
        message: 'INVALID_ADDRESS_DATA',
        status: 400,
      });
    });

    it('debería fallar si dirección con mismo ID ya existe', async () => {
      const userId = '12345678';
      const existingAddress = { id: 'addr1', city: 'Medellín', postalCode: '050001', address: 'Calle 1' };
      const mockUser = {
        _id: userId,
        addresses: [existingAddress],
        save: jest.fn(),
      };

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      await expect(
        addAddress(userId, existingAddress)
      ).rejects.toMatchObject({
        message: 'ADDRESS_ID_TAKEN',
        status: 409,
      });
    });
  });

  describe('updateAddress', () => {
    it('debería actualizar dirección exitosamente', async () => {
      const userId = '12345678';
      const addrId = 'addr1';
      const updateData = { city: 'Bogotá' };
      const mockUpdatedUser = {
        _id: userId,
        addresses: [
          { id: 'addr1', city: 'Bogotá', postalCode: '050001', address: 'Calle 1' },
        ],
      };

      (mockUserModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUpdatedUser),
      });
      (mockUserModel.exists as jest.Mock).mockResolvedValue(true);

      const result = await updateAddress(userId, addrId, updateData);

      expect(result).toBeDefined();
      expect(result.city).toBe('Bogotá');
    });

    it('debería fallar con userId inválido', async () => {
      await expect(
        updateAddress('' as any, 'addr1', { city: 'Bogotá' })
      ).rejects.toMatchObject({
        message: 'INVALID_USER_ID',
        status: 400,
      });
    });

    it('debería fallar con addrId inválido', async () => {
      await expect(
        updateAddress('12345678', '' as any, { city: 'Bogotá' })
      ).rejects.toMatchObject({
        message: 'INVALID_ADDRESS_ID',
        status: 400,
      });
    });

    it('debería fallar si no hay campos para actualizar', async () => {
      (mockUserModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        updateAddress('12345678', 'addr1', {})
      ).rejects.toMatchObject({
        message: 'NO_FIELDS_TO_UPDATE',
        status: 400,
      });
    });

    it('debería fallar si dirección no existe', async () => {
      (mockUserModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (mockUserModel.exists as jest.Mock).mockResolvedValue(true);

      await expect(
        updateAddress('12345678', 'addr999', { city: 'Bogotá' })
      ).rejects.toMatchObject({
        message: 'ADDRESS_NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('removeAddress', () => {
    it('debería eliminar dirección exitosamente', async () => {
      const userId = '12345678';
      const addrId = 'addr1';
      const mockResult = {
        _id: userId,
        addresses: [],
      };

      (mockUserModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockResult),
      });

      const result = await removeAddress(userId, addrId);

      expect(result).toEqual([]);
    });

    it('debería fallar si usuario no existe', async () => {
      (mockUserModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (mockUserModel.exists as jest.Mock).mockResolvedValue(false);

      await expect(
        removeAddress('nonexistent', 'addr1')
      ).rejects.toMatchObject({
        message: 'USER_NOT_FOUND',
        status: 404,
      });
    });

    it('debería fallar si dirección no existe', async () => {
      (mockUserModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      (mockUserModel.exists as jest.Mock).mockResolvedValue(true);

      await expect(
        removeAddress('12345678', 'addr999')
      ).rejects.toMatchObject({
        message: 'ADDRESS_NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('updateMe - casos edge', () => {
    it('debería fallar si no hay campos para actualizar', async () => {
      await expect(
        updateMe('12345678', {})
      ).rejects.toMatchObject({
        message: 'NO_FIELDS_TO_UPDATE',
        status: 400,
      });
    });

    it('debería actualizar solo password', async () => {
      const userId = '12345678';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        addresses: [],
      };

      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser as any);
      mockBcrypt.hash.mockResolvedValue('new-hashed-password' as never);

      const result = await updateMe(userId, { password: 'NewPassword123' });

      expect(result).toBeDefined();
      expect(mockBcrypt.hash).toHaveBeenCalled();
    });

    it('debería lanzar error si todos los campos están vacíos', async () => {
      const userId = '12345678';

      await expect(
        updateMe(userId, { name: '   ', phone: '   ' })
      ).rejects.toThrow('NO_FIELDS_TO_UPDATE');
    });
  });
});
