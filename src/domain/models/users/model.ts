export type UserRole = 'admin' | 'customer';
import { UserSchema } from './schema';
import { model, Types } from 'mongoose';
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
}
UserSchema.virtual('id').get(function (this: { _id: Types.ObjectId }) { return this._id.toHexString(); });
UserSchema.set('toJSON', { virtuals: true }); UserSchema.set('toObject', { virtuals: true });
export const UserModel = model<User>('User', UserSchema);