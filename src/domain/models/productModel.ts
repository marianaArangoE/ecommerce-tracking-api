export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductCreate {
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: string;
  isActive: boolean;
}

export interface ProductUpdate extends Partial<ProductCreate> {}
