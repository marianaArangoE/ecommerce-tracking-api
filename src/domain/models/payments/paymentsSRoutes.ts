import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireRole } from '../../../application/middlewares/auth';
import { validate } from '../../../application/middlewares/validate';
import * as Controller from './paymentsController';

const router = Router();

// todas las rutas requieren auth y rol customer o admin
router.get(
  '/methods',
  requireAuth,
  requireRole('customer'),
  Controller.listMyMethods
);

//añadir metodo de pago
router.post(
  '/methods',
  requireAuth,
  requireRole('customer'),
  [
    body('type').isIn(['credit_card','debit_card','paypal','transfer','cash_on_delivery']),
    body('provider').optional().isString(),
    body('cardNumber').optional().isString(),
    body('setDefault').optional().isBoolean(),
  ],
  validate,
  Controller.addMethod
);

//establecer metodo por defecto
router.post(
  '/methods/:id/default',
  requireAuth,
  requireRole('customer'),
  [ param('id').notEmpty() ],
  validate,
  Controller.setDefault
);

//eliminar metodo de pago
router.delete(
  '/methods/:id',
  requireAuth,
  requireRole('customer'),
  [ param('id').notEmpty() ],
  validate,
  Controller.removeMethod
);

//crear payment intent para una orden
router.post(
  '/orders/:orderId/pay',
  requireAuth,
  requireRole('customer'),
  [
    param('orderId').notEmpty(),
    body('method').optional().isIn(['card','transfer','cod']),
    body('paymentMethodId').optional().isString(),
    body('provider').optional().isString(),
  ],
  validate,
  Controller.createPaymentIntent
);

//confirmar pago con tarjeta
router.post(
  '/confirm',
  requireAuth,
  requireRole('customer'),
  [ body('intentId').notEmpty(), body('succeed').isBoolean() ],
  validate,
  Controller.confirmCardPayment
);

// ADMIN: confirmar transferencia bancaria
router.post(
  '/admin/:orderId/transfer/confirm',
  requireAuth,
  requireRole('admin'),
  [ param('orderId').notEmpty() ],
  validate,
  Controller.adminConfirmTransfer
);

// ADMIN: marcar COD como pagado
router.post(
  '/admin/:orderId/cod/paid',
  requireAuth,
  requireRole('admin'),
  [ param('orderId').notEmpty() ],
  validate,
  Controller.adminMarkCodPaid
);

export default router;
