import { ProductModel, ProductCreate, ProductUpdate } from "./model";
import Boom from "@hapi/boom";

const getAllProducts = async () => {
  const result = await ProductModel.find();
  if (!result) {
    throw Boom.notFound(`products not found`);
  } else {
    return result;
  }
};

const getByIdProduct = async (idProduct: string) => {
  const result = await ProductModel.findOne({
    id: idProduct,
  });
  if (!result) {
    throw Boom.notFound(`product id ${idProduct}, not found  `);
  } else {
    return result;
  }
};

const createProduct = async (data: ProductCreate) => {
  const newProduct = await ProductModel.create({ ...data });
  return newProduct;
};

const updateProduct = async (id: string, data: ProductUpdate) => {
  await getByIdProduct(id);
  const result = await ProductModel.updateOne(
    { id },
    { $set: data },
    { runValidators: true }
  );

  return result;
};

const deleteProduct = async (id: string) => {
  await getByIdProduct(id);

  const result = await ProductModel.deleteOne({ id });

  if (result.deletedCount === 0) {
    throw Boom.badImplementation(`No se pudo eliminar el producto '${id}'`);
  } else {
    return result;
  }
};

export const productService = {
  getAllProducts,
  getByIdProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
