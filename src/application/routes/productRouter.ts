import { Router } from "express";
import { productController } from "../controllers/productController";
import { schemaValidator } from "../middlewares/validatorHandler";
import { createProductSchema } from "../schemas/productSchema";

export const productRouter = Router();

productRouter.get("/", productController.getAllProducts);
productRouter.post("/",schemaValidator("body",createProductSchema), productController.createProduct);
