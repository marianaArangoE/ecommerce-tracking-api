import { Router } from 'express';
import { addItem, setItemQuantity, removeItem, getMyCart } from './service';

const router = Router();
router.use((req, _res, next) => {
  (req as any).userId = (req.headers['x-user-id'] as string) || 'demo';
  next();
});

router.get('/me', async (req, res) => {
  try { res.json(await getMyCart((req as any).userId)); }
  catch (e:any) { res.status(400).json({ error: e.message }); }
});

router.post('/items', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { productId, quantity } = req.body;
    const cart = await addItem({ userId, productId, quantity });
    res.status(201).json(cart);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

router.patch('/items/:productId', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const quantity = Number(req.body.quantity);
    const cart = await setItemQuantity({ userId, productId: req.params.productId, quantity });
    res.json(cart);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

router.delete('/items/:productId', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const cart = await removeItem({ userId, productId: req.params.productId });
    res.json(cart);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

export default router;
