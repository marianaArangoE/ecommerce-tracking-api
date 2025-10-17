export type ProductStatus = "draft" | "active" | "archived";
import { model, Schema, Types } from "mongoose";
import { ProductSchema } from "./schema";
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  stock: number;
  status: ProductStatus;
  categoryId?: string;
  images: string[];
  brand?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreate {
  sku: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  stock: number;
  status: ProductStatus;
  categoryId?: string;
  images: string[];
  brand?: string;
  tags?: string[];
  createdAt: string;
}

export interface ProductUpdate extends Partial<ProductCreate> {}

export const ProductModel = model<Product>("Product", ProductSchema);

// ProductSchema.virtual("id").get(function (this: { _id: Types.ObjectId }) {
//   return this._id.toHexString();
// });
// ProductSchema.set("toJSON", { virtuals: true });
// ProductSchema.set("toObject", { virtuals: true });

// export const ProductModel = model<Product>("Product", ProductSchema);
