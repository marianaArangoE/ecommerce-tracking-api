export type ProductStatus = 'draft' | 'active' | 'archived';
import { model, Types } from 'mongoose';
import { ProductSchema } from './schema';
export interface Product {
  id: string;                // Identificador único del producto
  sku: string;               // Stock Keeping Unit. Código interno único que sirve para controlar inventario. Ejemplo:"NSW-OLED-001"
  name: string;              // Nombre comercial del producto.
  description?: string;      // Texto descriptivo del producto.
  priceCents: number;        // Precio expresado en centavos o unidades mínimas de moneda (entero).
  currency: string;          // Código de moneda del precio, según el estándar ISO 4217. ejemplo "COP"
  stock: number;             // Cantidad de unidades disponibles para la venta.
  status: ProductStatus;     // Indica el estado de publicación del producto.
                                // draft: el producto existe pero aún no está publicado.
                                // active: visible y disponible para venta.
                                // archived: producto retirado o descontinuado.
  categoryId?: string;        // Identificador de la categoría a la que pertenece el producto.
  images: string[];           // Lista de URLs de imágenes del producto.
  brand?: string;              //Marca del producto. Puede ayudar a filtrar o clasificar en el frontend.
  tags?: string[];            //Palabras clave que ayudan a clasificar o buscar productos relacionados.
  createdAt: string;         // Fecha de creación
  updatedAt: string;         // Fecha de actualización
}


ProductSchema.virtual('id').get(function (this: { _id: Types.ObjectId }) {
  return this._id.toHexString();
});
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

export const ProductModel = model<Product>('Product', ProductSchema);