import { Router } from 'express';
import { requireCustomerWithVerifiedEmail } from '../../../application/middlewares/auth';
import * as Controller from './checkoutController';

const router = Router();

// POST /api/checkout
router.post('/', requireCustomerWithVerifiedEmail, Controller.createCheckout);

// GET /api/checkout/:id
router.get('/:id', requireCustomerWithVerifiedEmail, Controller.getCheckout);

export default router;
