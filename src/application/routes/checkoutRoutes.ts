import { Router } from 'express';
import { schemaValidator } from '../middlewares/validatorHandler';
import { requireCustomerWithVerifiedEmail } from '../middlewares/auth';
import * as Controller from '../controllers/checkoutController';
import {
  createCheckoutSchema,
  checkoutIdParamSchema,
} from '../schemas/checkoutSchemaJoi';

const router = Router();

// POST /api/checkout
router.post(
  '/',
  requireCustomerWithVerifiedEmail,
  schemaValidator('body', createCheckoutSchema),
  Controller.createCheckout
);

// GET /api/checkout/:id
router.get(
  '/:id',
  requireCustomerWithVerifiedEmail,
  schemaValidator('params', checkoutIdParamSchema),
  Controller.getCheckout
);

export default router;
