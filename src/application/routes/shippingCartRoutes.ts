import { Router } from 'express';
import { schemaValidator } from '../middlewares/validatorHandler';
import { requireAuth, requireAnyRole } from '../middlewares/auth';
import * as Controller from '../controllers/shippingCartController';
import {
  addItemSchema,
  setItemQuantitySchema,
  productIdParamSchema,
} from '../schemas/shippingCartSchemaJoi';

const router = Router();
router.use(requireAuth, requireAnyRole(['customer']));

//ver mi carrito
router.get('/me', Controller.getMyCart);

//agregar item
router.post(
  '/items',
  schemaValidator('body', addItemSchema),
  Controller.addItem
);

//actualizar cantidad
router.patch(
  '/items/:productId',
  schemaValidator('params', productIdParamSchema),
  schemaValidator('body', setItemQuantitySchema),
  Controller.setItemQuantity
);

//eliminar item
router.delete(
  '/items/:productId',
  schemaValidator('params', productIdParamSchema),
  Controller.removeItem
);

export default router;
