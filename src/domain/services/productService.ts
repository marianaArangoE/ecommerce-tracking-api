import Boom from "@hapi/boom";
import { Product, ProductCreate, ProductUpdate } from "../models/productModel";

const getAllProducts = async () => {
  const result = await new Promise((resolve) =>
    setTimeout(() => {
      resolve(`Read products`);
    }, 500)
  );

  throw new Error("Database connection error");
  return result;
};

const getByIdProduct = async (id: number) => {
  const result = await new Promise((resolve) =>
    setTimeout(() => {
      resolve(`Read product ${id}`);
    }, 500)
  );
  console.log("result0");
  throw Boom.notFound("product not found");
  return result;
};

const createProduct = async (data: ProductCreate) => {
  const newProduct: ProductCreate = data;
  const result = await new Promise((resolve) =>
    setTimeout(() => {
      resolve(newProduct);
    }, 500)
  );
  return result;
};

const updateProduct = async (id: number, data: ProductUpdate) => {
  const result = await new Promise((resolve) =>
    setTimeout(() => {
      resolve(`Update product ${id}`);
    }, 500)
  );
  return result;
};

const deleteProduct = async (id: number) => {
  const result = await new Promise((resolve) =>
    setTimeout(() => {
      resolve(`Delete product`);
    }, 500)
  );
  return result;
};

export const productService = {
  getAllProducts,
  getByIdProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
