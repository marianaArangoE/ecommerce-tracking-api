import { Response, Request } from "express";
import { productService } from "../../domain/services/productService";
import { ProductCreate } from "../../domain/models/productModel";

const getAllProducts = async (req: Request, res: Response) => {
  res.send(await productService.getAllProducts());
};

const createProduct = async (req: Request, res: Response) => {
  const data:ProductCreate = req.body;
  res.send(await productService.createProduct(data));
};

export const productController = {
  getAllProducts,
  createProduct,
};
