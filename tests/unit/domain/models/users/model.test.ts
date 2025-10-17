import { User, UserRole, Address } from '../../../../../src/domain/models/users/model';

describe('User Model', () => {
  describe('User Interface', () => {
    it('debería definir correctamente la interfaz User', () => {
      const user: User = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        phone: '1234567890',
        emailVerified: false,
        emailVerificationToken: 'token123',
        emailVerificationExpires: new Date(),
        createdAt: new Date().toISOString(),
        role: 'customer',
        addresses: [],
        failedLoginCount: 0,
        lockUntil: null,
        refreshTokens: []
      };

      expect(user._id).toBe('12345678');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('customer');
    });

    it('debería permitir campos opcionales', () => {
      const user: User = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        role: 'admin'
      };

      expect(user.phone).toBeUndefined();
      expect(user.addresses).toBeUndefined();
      expect(user.failedLoginCount).toBeUndefined();
    });
  });

  describe('Address Interface', () => {
    it('debería definir correctamente la interfaz Address', () => {
      const address: Address = {
        id: 'addr1',
        city: 'Bogotá',
        postalCode: '110111',
        address: 'Calle 123 #45-67'
      };

      expect(address.id).toBe('addr1');
      expect(address.city).toBe('Bogotá');
      expect(address.postalCode).toBe('110111');
      expect(address.address).toBe('Calle 123 #45-67');
    });
  });

  describe('UserRole Type', () => {
    it('debería aceptar roles válidos', () => {
      const adminRole: UserRole = 'admin';
      const customerRole: UserRole = 'customer';

      expect(adminRole).toBe('admin');
      expect(customerRole).toBe('customer');
    });
  });

  describe('Virtual ID', () => {
    it('debería manejar diferentes tipos de ID', () => {
      // Simular diferentes tipos de _id
      const mockObjectId = {
        toHexString: () => '507f1f77bcf86cd799439011'
      };

      const mockStringId = '12345678';
      const mockNumberId = 12345678;

      // Simular la función virtual
      const virtualId = (id: any) => {
        if (typeof id === 'string') return id;
        if (id && typeof id.toHexString === 'function') return id.toHexString();
        return id?.toString?.() || id;
      };

      expect(virtualId(mockObjectId)).toBe('507f1f77bcf86cd799439011');
      expect(virtualId(mockStringId)).toBe('12345678');
      expect(virtualId(mockNumberId)).toBe('12345678');
    });
  });

  describe('User Creation', () => {
    it('debería crear un usuario con todos los campos requeridos', () => {
      const userData = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        role: 'customer' as UserRole
      };

      expect(userData._id).toBeDefined();
      expect(userData.email).toBeDefined();
      expect(userData.passwordHash).toBeDefined();
      expect(userData.name).toBeDefined();
      expect(userData.role).toBeDefined();
    });

    it('debería crear un usuario con campos opcionales', () => {
      const userData = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        phone: '1234567890',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        role: 'customer' as UserRole,
        addresses: [
          {
            id: 'addr1',
            city: 'Bogotá',
            postalCode: '110111',
            address: 'Calle 123 #45-67'
          }
        ],
        failedLoginCount: 0,
        lockUntil: null,
        refreshTokens: [
          {
            token: 'refresh-token',
            expiresAt: new Date()
          }
        ]
      };

      expect(userData.phone).toBeDefined();
      expect(userData.addresses).toHaveLength(1);
      expect(userData.refreshTokens).toHaveLength(1);
    });
  });
});