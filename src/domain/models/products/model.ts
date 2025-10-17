export type ProductStatus = "draft" | "active" | "archived";
import { model, Schema, Types } from "mongoose";
import { ProductSchema } from "./schema";
export interface Product {
  id: string; // Identificador único del producto
  sku: string; // Código interno único (Osea no se repite) que sirve para controlar inventario. Ejemplo:"NSWOLED001, En el Doc dice que esto debe ser A#"
  name: string; // Nombre del producto.
  description?: string; // Texto descriptivo del producto, aunque nadie lo vaya a leer
  priceCents: number; // Esto es maximo, repito MAXIMO 2 decimales.
  currency: string; // Código de moneda del precio, según el estándar ISO 4217. ejemplo "COP"
  stock: number; // Cantidad de unidades disponibles para la venta.
  status: ProductStatus; // Indica el estado de publicación del producto.
  // draft: el producto existe pero aún no está publicado.
  // active: visible y disponible para venta.
  // archived: producto retirado o descontinuado.
  categoryId?: string; // Identificador de la categoría a la que pertenece el producto.
  images: string[]; // Lista de URLs de imágenes del producto.
  brand?: string; //Marca del producto. Puede ayudar a filtrar o clasificar en el frontend.
  tags?: string[]; //Palabras clave que ayudan a clasificar o buscar productos relacionados.
  createdAt: string; // Fecha de creación
  updatedAt: string; // Fecha de actualización
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
