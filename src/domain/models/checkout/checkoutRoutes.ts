import { Router } from 'express';
import { createCheckout, getCheckout } from '../../services/checkoutService';
import { requireCustomerWithVerifiedEmail, AuthReq } from '../../../application/middlewares/auth';

const router = Router();

// POST /api/checkout
router.post('/', requireCustomerWithVerifiedEmail, async (req: AuthReq, res) => {
  try {
    const userId = req.user!.sub;
    const chk = await createCheckout({
      userId: req.user!.sub,
      addressId: req.body.addressId,
      shippingMethod: req.body.shippingMethod,
      paymentMethod: req.body.paymentMethod,
    });
    res.status(201).json(chk);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

// GET /api/checkout/:id
router.get('/:id', requireCustomerWithVerifiedEmail, async (req: AuthReq, res) => {
  try {
    const userId = req.user!.sub;
    res.json(await getCheckout(userId, req.params.id));
  } catch (e:any) { res.status(404).json({ error: e.message }); }
});

export default router;
