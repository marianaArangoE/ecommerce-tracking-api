import { Router } from 'express';
import { createCheckout, getCheckout } from './service';

const router = Router();
router.use((req, _res, next) => {
  (req as any).userId = (req.headers['x-user-id'] as string) || 'demo';
  next();
});

// POST /api/checkout  { addressId, shippingMethod, paymentMethod }
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const chk = await createCheckout({
      userId,
      addressId: req.body.addressId,
      shippingMethod: req.body.shippingMethod,
      paymentMethod: req.body.paymentMethod,
    });
    res.status(201).json(chk);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

// GET /api/checkout/:id
router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    res.json(await getCheckout(userId, req.params.id));
  } catch (e:any) { res.status(404).json({ error: e.message }); }
});

export default router;
