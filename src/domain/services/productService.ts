import  Boom  from "@hapi/boom";
import { Product, ProductCreate, ProductUpdate } from "../models/productModel";

const getAllProducts = async () => {
  throw Boom.notFound("Products not found");
  return "Fetching all products..." 
};



const createProduct = async (data: ProductCreate) => {
  const newProduct = await new Promise<Product>((resolve) => {
    setTimeout(
      () =>
        resolve({
          id: "1",
          ...data,
          createdAt: new Date().toUTCString(),
        }),
      1000
    );
  });

  return newProduct;
};

export const productService = {
  getAllProducts,
  createProduct,
};
