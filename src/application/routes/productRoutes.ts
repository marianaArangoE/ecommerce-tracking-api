import { Router } from "express";
import { productController } from "../controllers/productController";
import { schemaValidator } from "../middlewares/validatorHandler";
import { createProductSchema, updateProductSchema } from "../schemas/productSchemaJoi";
import {
  requireAuth,
  requireRole,
  requireAnyRole,
  AuthReq,
} from "../middlewares/auth";

export const productRouter = Router();

productRouter.get(
  "/",
  requireAuth,
  requireAnyRole(["customer", "admin"]),
  productController.getAllProducts
);
productRouter.get(
  "/:id",
  requireAuth,
  requireAnyRole(["customer", "admin"]),
  productController.getByIdProduct
);
productRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  schemaValidator("body", createProductSchema),
  productController.createProduct
);
productRouter.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  schemaValidator("body", updateProductSchema),
  productController.updateProduct
);
productRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  productController.deleteProduct
);
