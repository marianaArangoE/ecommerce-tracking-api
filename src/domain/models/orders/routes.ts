import { Router } from 'express';
import { confirmOrder, getMyOrder, listMyOrders } from './service';
import { requireCustomerWithVerifiedEmail, AuthReq } from '../../../application/middlewares/auth';

const router = Router();

// POST /api/v1/orders/confirm { checkoutId, email }
router.post('/confirm', requireCustomerWithVerifiedEmail, async (req: AuthReq, res) => {
  try {
    const { checkoutId, email } = req.body || {};
    if (!checkoutId || !email) return res.status(400).json({ error: 'checkoutId y email son requeridos' });
    const order = await confirmOrder({ userId: req.user!.sub, checkoutId, email });
    res.status(201).json(order);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

// GET /api/v1/orders/:orderId (solo del propio usuario)
router.get('/:orderId', requireCustomerWithVerifiedEmail, async (req: AuthReq, res) => {
  try {
    const data = await getMyOrder(req.user!.sub, req.params.orderId);
    res.json(data);
  } catch (e:any) { res.status(404).json({ error: e.message }); }
});

// GET /api/v1/orders?status=PENDIENTE (listado propio)
router.get('/', requireCustomerWithVerifiedEmail, async (req: AuthReq, res) => {
  try {
    const status = req.query.status as any;
    const data = await listMyOrders(req.user!.sub, status);
    res.json(data);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

export default router;
