import { Router } from 'express';
import { createCheckout, getCheckout } from './service';
import { requireAuth, requireAnyRole, AuthReq } from '../../../application/middlewares/auth';
const router = Router();
router.use(requireAuth, requireAnyRole(['customer']));
router.post('/', async (req: AuthReq, res) => {
  try {
    const chk = await createCheckout({
      userId: req.user!.sub,
      addressId: req.body.addressId,
      shippingMethod: req.body.shippingMethod,
      paymentMethod: req.body.paymentMethod,
    });
    res.status(201).json(chk);
  } catch (e:any) { res.status(400).json({ error: e.message }); }
});

router.get('/:id', async (req: AuthReq, res) => {
  try { res.json(await getCheckout(req.user!.sub, req.params.id)); }
  catch (e:any) { res.status(404).json({ error: e.message }); }
});

export default router;
