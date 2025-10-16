import { Response, Request, NextFunction } from "express";
import { productService } from "./service";
import { ProductCreate, ProductUpdate } from "./model";
import { log } from "console";

const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.send(await productService.getAllProducts());
  } catch (error) {
    next(error);
  }
};

const getByIdProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {id} = req.params;
    res.send(await productService.getByIdProduct(String(id)));
  } catch (error) {
    next(error);
  }
};

const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data: ProductCreate = req.body;
    res.send(await productService.createProduct(data));
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data: ProductUpdate = req.body;

    res.send(await productService.updateProduct(String(id), data));
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    res.send(await productService.deleteProduct(id));
  } catch (error) {
    next(error);
  }
};

export const productController = {
  getAllProducts,
  getByIdProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
