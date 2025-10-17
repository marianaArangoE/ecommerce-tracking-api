import { Schema } from 'mongoose';

//items
export const CartItemSchema = new Schema({
  productId:       { type: String, required: true, trim: true, index: true },
  sku:             { type: String, required: true, trim: true },
  name:            { type: String, required: true, trim: true },
  image:           { type: String, trim: true },
  quantity:        { type: Number, required: true, min: 1, max: 999 },
  unitPriceCents:  { type: Number, required: true, min: 0 },
  totalCents:      { type: Number, required: true, min: 0, default: 0 }, 
  priceLockUntil:  { type: Date } 
}, { _id: false, strict: true });
//carrito
export const CartSchema = new Schema({
  userId:        { type: String, required: true, index: true, trim: true },
  currency:      { type: String, required: true, enum: ['COP', 'USD'], default: 'COP' },
  status:        { type: String, required: true, enum: ['active', 'closed'], default: 'active' },
  items:         { type: [CartItemSchema], default: [] },
  subtotalCents: { type: Number, required: true, min: 0, default: 0 },
}, {
  versionKey: false,
  timestamps: true,                 
  toObject:   { virtuals: true },
  toJSON:     { virtuals: true }
});

CartSchema.virtual('id').get(function () {
  return this._id?.toHexString?.() ?? String(this._id);
});

//un solo carrito activo por usuario
CartSchema.index({ userId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
//calcula totales
function recalc(cart: any) {
  let subtotal = 0;
  for (const it of cart.items) {
    const qty  = Number(it.quantity || 0);
    const unit = Number(it.unitPriceCents || 0);
    // evitar negativos y decimales
    it.totalCents = Math.max(0, Math.round(qty * unit));
    subtotal += it.totalCents;
  }
  cart.subtotalCents = Math.max(0, Math.round(subtotal));
}
//antes de guardar
CartSchema.pre('validate', function (next) {
  recalc(this);
  next();
});

CartSchema.pre('save', function (next) {
  recalc(this);
  next();
});

//pasar fechas a ISO
CartSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret:any) => {
    if (ret.createdAt instanceof Date) ret.createdAt= ret.createdAt.toISOString();
    if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
    return ret;
  }
});
CartSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret:any) => {
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
    return ret;
  }
});
