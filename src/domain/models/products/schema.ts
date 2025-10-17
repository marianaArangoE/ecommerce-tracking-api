import mongoose,{ Schema } from "mongoose";

export const ProductSchema = new Schema(
  {
    id: { type: String, required: true, unique: true }, // ← campo REAL
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    priceCents: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    //get: (v) => parseFloat(v.toString()), // convierte a número legible
    //set: (v) => mongoose.Types.Decimal128.fromString(v.toString())
    get: (v) => (v ? parseFloat(v.toString()) : null) 
  },
    currency: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      required: true,
      default: "draft",
    },
    categoryId: { type: String },
    images: { type: [String], required: true },
    brand: { type: String },
    tags: { type: [String] },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
    versionKey: false, // Elimina el campo "__v"
    toJSON: { getters: true }, // <-- activa los getters en las respuestas JSON
    toObject: { getters: true },
  }
);

// const ProductSchema = new Schema({
//   sku:        { type: String, required: true, unique: true },
//   name:       { type: String, required: true },
//   description:{ type: String },
//   priceCents: { type: Number, required: true, min: 0 },
//   currency:   { type: String, required: true }, // ISO-4217
//   stock:      { type: Number, required: true, min: 0 },
//   status:     { type: String, enum: ['draft','active','archived'], default: 'draft' },
//   categoryId: { type: String },
//   images:     { type: [String], default: [] },
//   brand:      { type: String },
//   tags:       { type: [String], default: [] },
//   createdAt:  { type: String, required: true },
//   updatedAt:  { type: String, required: true },
// }, { versionKey: false });


