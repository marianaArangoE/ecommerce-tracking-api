import { Router } from "express";
import { productController } from "./controller";
import { schemaValidator } from "../../../application/middlewares/validatorHandler";
import { createProductSchema, updateProductSchema } from "./productSchema";
import {
  requireAuth,
  requireRole,
  requireAnyRole,
  AuthReq,
} from "../../../application/middlewares/auth";

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
  requireAnyRole(["customer", "admin"]),
  schemaValidator("body", updateProductSchema),
  productController.updateProduct
);
productRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  productController.deleteProduct
);
