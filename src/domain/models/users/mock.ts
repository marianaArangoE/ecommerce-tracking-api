import { User } from './userModel';
export const users: User[] = [
  {
    _id: 'u1',
    email: 'mae@example.com',
    passwordHash: '***',
    name: 'Ana',
    role: 'customer',
    emailVerified: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'u2',
    email: 'admin@example.com',
    passwordHash: '***',
    name: 'Admin',
    role: 'admin',
    emailVerified: true,
    createdAt: new Date().toISOString(),
  },
];
