import mongoose from 'mongoose';
import { UserSchema } from '../../../../../src/infrastructure/schemas/userSchema';
import { model } from 'mongoose';

// Tipos e interfaces
export type UserRole = 'admin' | 'customer';
export interface Address { 
  id: string; 
  city: string; 
  postalCode: string; 
  address: string; 
}
export interface User {
  _id: string; 
  email: string; 
  passwordHash: string; 
  name: string; 
  phone?: string;
  emailVerified: boolean; 
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  createdAt: string; 
  role: UserRole; 
  addresses?: Address[];
  failedLoginCount?: number;
  lockUntil?: Date | null;
  refreshTokens?: { token: string; expiresAt: Date }[];
}

// Configurar virtual id (igual que en userModel.ts)
UserSchema.virtual('id').get(function (this: any) {
  const id = this._id;
  if (typeof id === 'string') {
    return id;
  }
  if (id && typeof id.toHexString === 'function') {
    return id.toHexString();
  }
  return id?.toString?.() || id;
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

describe('UserModel', () => {
  let TestUserModel: mongoose.Model<User>;

  beforeAll(() => {
    if (mongoose.models.User) {
      delete mongoose.models.User;
    }
    TestUserModel = model<User>('User', UserSchema);
  });

  afterEach(async () => {
    try {
      await TestUserModel.deleteMany({});
    } catch (e) {
      // Ignorar errores de conexión en tests unitarios
    }
  });

  describe('Virtual id', () => {
    it('debería retornar id como string cuando _id es string', async () => {
      const user = new TestUserModel({
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        role: 'customer',
      });

      expect(user.id).toBe('12345678');
    });

    it('debería retornar id usando toHexString cuando _id es ObjectId', async () => {
      const objectId = new mongoose.Types.ObjectId();
      const user = new TestUserModel({
        _id: objectId as any,
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        role: 'customer',
      });

      expect(user.id).toBe(objectId.toHexString());
    });

    it('debería retornar id usando toString cuando _id tiene toString', async () => {
      const mockId = {
        toString: jest.fn().mockReturnValue('mock-id'),
      };
      const user = new TestUserModel({
        _id: mockId as any,
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        role: 'customer',
      });

      expect(user.id).toBe('mock-id');
    });

    it('debería incluir id en toJSON', async () => {
      const user = new TestUserModel({
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        role: 'customer',
      });
      await user.save();

      const json = user.toJSON() as any;
      expect(json.id).toBe('12345678');
      expect(json._id).toBeDefined();
    });

    it('debería incluir id en toObject', async () => {
      const user = new TestUserModel({
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        role: 'customer',
      });
      await user.save();

      const obj = user.toObject() as any;
      expect(obj.id).toBe('12345678');
    });
  });

  describe('User interface', () => {
    it('debería crear usuario con todos los campos requeridos', async () => {
      const userData: Partial<User> = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        role: 'customer',
      };

      const user = new TestUserModel(userData);
      await user.save();

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('customer');
    });

    it('debería permitir campos opcionales', async () => {
      const userData: Partial<User> = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        role: 'customer',
        phone: '1234567890',
        addresses: [
          {
            id: 'addr1',
            city: 'Medellín',
            postalCode: '050001',
            address: 'Calle 1',
          },
        ],
        failedLoginCount: 0,
        lockUntil: null,
        refreshTokens: [],
      };

      const user = new TestUserModel(userData);
      await user.save();

      expect(user.phone).toBe('1234567890');
      expect(user.addresses).toHaveLength(1);
    });

    it('debería validar role enum', async () => {
      const userData: any = {
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        role: 'invalid-role',
      };

      const user = new TestUserModel(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Address interface', () => {
    it('debería validar estructura de Address', () => {
      const address: Address = {
        id: 'addr1',
        city: 'Medellín',
        postalCode: '050001',
        address: 'Calle 1',
      };

      expect(address.id).toBe('addr1');
      expect(address.city).toBe('Medellín');
      expect(address.postalCode).toBe('050001');
      expect(address.address).toBe('Calle 1');
    });
  });

  describe('Schema configuration', () => {
    it('debería tener versionKey deshabilitado', () => {
      expect(UserSchema.get('versionKey')).toBe(false);
    });

    it('debería tener toJSON con virtuals', () => {
      const user = new TestUserModel({
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        role: 'customer',
      });

      const json = user.toJSON() as any;
      expect(json.id).toBeDefined();
    });

    it('debería tener toObject con virtuals', () => {
      const user = new TestUserModel({
        _id: '12345678',
        email: 'test@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        role: 'customer',
      });

      const obj = user.toObject() as any;
      expect(obj.id).toBeDefined();
    });
  });
});
