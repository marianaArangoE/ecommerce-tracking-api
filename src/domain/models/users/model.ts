export type UserRole = 'admin' | 'customer';
import { UserSchema } from './schema';
import { model } from 'mongoose';
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
  createdAt: string; 
  role: UserRole; 
  addresses?: Address[];
  failedLoginCount?: number;
  lockUntil?: Date | null;
  refreshTokens?: { token: string; expiresAt: Date }[];
}
UserSchema.virtual('id').get(function (this: any) {
  const id = this._id;
  if (typeof id === 'string') 
  {
    return id;
  }
if (id && typeof id.toHexString === 'function') 
  {
    return id.toHexString();
  }
  return id?.toString?.() || id;
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });
export const UserModel = model<User>('User', UserSchema);