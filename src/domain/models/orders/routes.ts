import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { confirmOrder, getMyOrder, listMyOrders } from './service';

const router = Router();

router.use((req, res, next) => {
  const uid = String(req.headers['x-user-id'] || '');
  if (!isValidObjectId(uid)) return res.status(401).json({ error: 'x-user-id inválido' });
  (req as any).userId = uid;
  next();
});

// POST /api/v1/orders/confirm { checkoutId, email }
router.post('/confirm', async (req, res) => {
  try {
    const { checkoutId, email } = req.body || {};
    if (!checkoutId || !email) return res.status(400).json({ error: 'checkoutId y email son requeridos' });
    const order = await confirmOrder({ userId: (req as any).userId, checkoutId, email });
    res.status(201).json(order);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

// GET /api/v1/orders/:orderId (solo del propio usuario)
router.get('/:orderId', async (req, res) => {
  try {
    const data = await getMyOrder((req as any).userId, req.params.orderId);
    res.json(data);
  } catch (e:any) { res.status(404).json({ error: e.message }); }
});

// GET /api/v1/orders?status=PENDIENTE (listado propio)
router.get('/', async (req, res) => {
  try {
    const status = req.query.status as any;
    const data = await listMyOrders((req as any).userId, status);
    res.json(data);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

export default router;
