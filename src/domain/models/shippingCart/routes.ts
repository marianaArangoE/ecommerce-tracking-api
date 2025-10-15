import { Router } from 'express';
import { addItem, setItemQuantity, removeItem, getMyCart } from './service';
import { requireAuth, requireAnyRole, AuthReq } from '../../../application/middlewares/auth';

const router = Router();
router.use(requireAuth, requireAnyRole(['customer']));
router.get('/me', async (req: AuthReq, res) => {
  try { res.json(await getMyCart(req.user!.sub)); }
  catch (e:any) { res.status(400).json({ error: e.message }); }
});

router.post('/items', async (req: AuthReq, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await addItem({ userId: req.user!.sub, productId, quantity });
    res.status(201).json(cart);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

router.patch('/items/:productId', async (req: AuthReq, res) => {
  try {
    const quantity = Number(req.body.quantity);
    const cart = await setItemQuantity({ userId: req.user!.sub, productId: req.params.productId, quantity });
    res.json(cart);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

router.delete('/items/:productId', async (req: AuthReq, res) => {
  try {
    const cart = await removeItem({ userId: req.user!.sub, productId: req.params.productId });
    res.json(cart);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

export default router;
