import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../application/middlewares/validate';
import { requireAuth, requireAnyRole } from '../../../application/middlewares/auth';
import * as Controller from './shippingCartController';

const router = Router();
router.use(requireAuth, requireAnyRole(['customer']));

//ver mi carrito
router.get('/me', Controller.getMyCart);


//agregar item
router.post(
  '/items',
  [
    body('productId').notEmpty().withMessage('productId requerido'),
    body('quantity').isInt({ min: 1, max: 999 }).withMessage('quantity debe ser entero 1..999'),
  ],
  validate,
  Controller.addItem
);

//actualizar cantidad
router.patch(
  '/items/:productId',
  [
    param('productId').notEmpty().withMessage('productId requerido en URL'),
    body('quantity').isInt({ min: 1, max: 999 }).withMessage('quantity debe ser entero 1..999'),
  ],
  validate,
  Controller.setItemQuantity
);

//eliminar item
router.delete(
  '/items/:productId',
  [param('productId').notEmpty().withMessage('productId requerido en URL')],
  validate,
  Controller.removeItem
);

export default router;
