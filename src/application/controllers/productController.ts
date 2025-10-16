import { Response, Request } from "express";
import { productService } from "../../domain/services/productService";
import { ProductCreate } from "../../domain/models/productModel";

const getAllProducts = async (req: Request, res: Response) => {
  res.send(await productService.getAllProducts());
};

const getByIdProduct = async (req: Request, res: Response) => {
  res.send(await productService.getByIdProduct(1));
};

const createProduct = async (req: Request, res: Response) => {
  const data: ProductCreate = req.body;
  res.send(await productService.createProduct(data));
};

const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  res.send(await productService.updateProduct(Number(id), {}));
};

const deleteProduct = async (req: Request, res: Response) => {
  res.send(await productService.deleteProduct(1));
};

export const productController = {
  getAllProducts,
  getByIdProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
