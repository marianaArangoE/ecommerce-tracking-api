import { Schema } from 'mongoose';

export const AddressSchema = new Schema({
  id:         { type: String, required: true },
  city:       { type: String, required: true },
  postalCode: { type: String, required: true },
  address:    { type: String, required: true },
}, { _id: false });

export const UserSchema = new Schema({
  _id :            { type: String, required: true},
  email:         { type: String, required: true, unique: true },
  passwordHash:  { type: String, required: true },
  name:          { type: String, required: true },
  phone:         { type: String },
  emailVerified: { type: Boolean, default: false },
  createdAt:     { type: String, required: true },
  role:          { type: String, enum: ['admin','customer'], required: true },
  addresses:     { type: [AddressSchema], default: [] },
}, { versionKey: false });
