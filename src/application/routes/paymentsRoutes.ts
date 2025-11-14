import { Router } from 'express';
import { schemaValidator } from '../middlewares/validatorHandler';
import { requireAuth, requireRole } from '../middlewares/auth';
import * as Controller from '../controllers/paymentsController';
import {
  addPaymentMethodSchema,
  createPaymentIntentSchema,
  confirmCardPaymentSchema,
  methodIdParamSchema,
  orderIdPaymentParamSchema,
} from '../schemas/paymentsSchemaJoi';

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
  schemaValidator('body', addPaymentMethodSchema),
  Controller.addMethod
);

//establecer metodo por defecto
router.post(
  '/methods/:id/default',
  requireAuth,
  requireRole('customer'),
  schemaValidator('params', methodIdParamSchema),
  Controller.setDefault
);

//eliminar metodo de pago
router.delete(
  '/methods/:id',
  requireAuth,
  requireRole('customer'),
  schemaValidator('params', methodIdParamSchema),
  Controller.removeMethod
);

//crear payment intent para una orden
router.post(
  '/orders/:orderId/pay',
  requireAuth,
  requireRole('customer'),
  schemaValidator('params', orderIdPaymentParamSchema),
  schemaValidator('body', createPaymentIntentSchema),
  Controller.createPaymentIntent
);

//confirmar pago con tarjeta
router.post(
  '/confirm',
  requireAuth,
  requireRole('customer'),
  schemaValidator('body', confirmCardPaymentSchema),
  Controller.confirmCardPayment
);

// ADMIN: confirmar transferencia bancaria
router.post(
  '/admin/:orderId/transfer/confirm',
  requireAuth,
  requireRole('admin'),
  schemaValidator('params', orderIdPaymentParamSchema),
  Controller.adminConfirmTransfer
);

// ADMIN: marcar COD como pagado
router.post(
  '/admin/:orderId/cod/paid',
  requireAuth,
  requireRole('admin'),
  schemaValidator('params', orderIdPaymentParamSchema),
  Controller.adminMarkCodPaid
);

export default router;
