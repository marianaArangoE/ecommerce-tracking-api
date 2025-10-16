import { Router } from "express";
import { productController } from "../controllers/productController";
import { schemaValidator } from "../middlewares/validatorHandler";
import { createProductSchema } from "../schemas/productSchema";

export const productRouter = Router();

productRouter.get("/", productController.getAllProducts);
productRouter.get("/:id", productController.getByIdProduct)
productRouter.post("/",schemaValidator("body",createProductSchema), productController.createProduct);
productRouter.patch("/:id", productController.updateProduct)
productRouter.delete("/:id", productController.deleteProduct)

