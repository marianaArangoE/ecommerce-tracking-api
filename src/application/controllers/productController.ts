import { Response, Request, NextFunction } from "express";
import { productService } from "../../domain/services/productService";
import { ProductCreate, ProductUpdate } from "../../domain/models/products/productModel";


const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role } = req["user"];
    if (role == "admin") {
      res.send(await productService.getAllProducts());
    }
    if (role == "customer") {
      res.send(await productService.getAllProductsCustomer());
    }
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
    const { id } = req.params;
    //res.send(await productService.getByIdProduct(String(id)));

    const { role } = req["user"];
    if (role == "admin") {
      res.send(await productService.getByIdProduct(String(id)));
    }
    if (role == "customer") {
      res.send(await productService.getByIdProductCustomer(String(id)));
    }
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
