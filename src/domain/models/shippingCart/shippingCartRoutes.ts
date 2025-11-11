import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../application/middlewares/validate';
import { addItem, setItemQuantity, removeItem, getMyCart } from '../../services/shippingCartService';
import { requireAuth, requireAnyRole, AuthReq } from '../../../application/middlewares/auth';

const router = Router();
router.use(requireAuth, requireAnyRole(['customer']));

//ver mi carrito
router.get('/me', async (req: AuthReq, res) => {
  try {
    const cart = await getMyCart(req.user!.sub);
    res.json(cart);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'CART_GET_ERROR' });
  }
});


//agregar item
router.post(
  '/items',
  [
    body('productId').notEmpty().withMessage('productId requerido'),
    body('quantity').isInt({ min: 1, max: 999 }).withMessage('quantity debe ser entero 1..999'),
  ],
  validate,
  async (req: AuthReq, res) => {
    try {
      const { productId, quantity } = req.body;
      const cart = await addItem({ userId: req.user!.sub, productId, quantity: Number(quantity) });
      res.status(201).json(cart);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message || 'CART_ADD_ERROR' });
    }
  }
);

//actualizar cantidad
router.patch(
  '/items/:productId',
  [
    param('productId').notEmpty().withMessage('productId requerido en URL'),
    body('quantity').isInt({ min: 1, max: 999 }).withMessage('quantity debe ser entero 1..999'),
  ],
  validate,
  async (req: AuthReq, res) => {
    try {
      const quantity = Number(req.body.quantity);
      const cart = await setItemQuantity({
        userId: req.user!.sub,
        productId: req.params.productId,
        quantity,
      });
      res.json(cart);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message || 'CART_SET_QTY_ERROR' });
    }
  }
);

//eliminar item
router.delete(
  '/items/:productId',
  [param('productId').notEmpty().withMessage('productId requerido en URL')],
  validate,
  async (req: AuthReq, res) => {
    try {
      const cart = await removeItem({ userId: req.user!.sub, productId: req.params.productId });
      res.json(cart);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message || 'CART_REMOVE_ERROR' });
    }
  }
);

export default router;
