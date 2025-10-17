import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireRole, requireAnyRole, AuthReq } from '../../../application/middlewares/auth';
import { validate } from '../../../application/middlewares/validate';
import * as Svc from './services'; 

const router = Router();

/* =========================
   MÉTODOS DE PAGO (cliente)
   Base: /api/v1/payments
   ========================= */

/** GET /api/v1/payments/methods */
router.get(
  '/methods',
  requireAuth,
  requireRole('customer'),
  async (req: AuthReq, res) => {
    const items = await Svc.listMyMethods(req.user!.sub);
    res.json({ items, total: items.length });
  }
);

/** POST /api/v1/payments/methods  (crear y opcionalmente dejar por defecto) */
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
  async (req: AuthReq, res) => {
    try {
      const out = await Svc.addMethod(req.user!.sub, {
        type: req.body.type,
        provider: req.body.provider,
        cardNumber: req.body.cardNumber,
        setDefault: req.body.setDefault,
      });
      res.status(201).json(out);
    } catch (e:any) { res.status(e.status || 400).json({ error: e.message }); }
  }
);

/** POST /api/v1/payments/methods/:id/default */
router.post(
  '/methods/:id/default',
  requireAuth,
  requireRole('customer'),
  [ param('id').notEmpty() ],
  validate,
  async (req: AuthReq, res) => {
    try {
      const out = await Svc.setDefault(req.user!.sub, req.params.id);
      res.json(out);
    } catch (e:any) { res.status(e.status || 400).json({ error: e.message }); }
  }
);

/** DELETE /api/v1/payments/methods/:id */
router.delete(
  '/methods/:id',
  requireAuth,
  requireRole('customer'),
  [ param('id').notEmpty() ],
  validate,
  async (req: AuthReq, res) => {
    try {
      const out = await Svc.removeMethod(req.user!.sub, req.params.id);
      res.json(out);
    } catch (e:any) { res.status(e.status || 400).json({ error: e.message }); }
  }
);


/* =========================
   PAYMENT INTENTS / PAGOS
   ========================= */

/** POST /api/v1/payments/orders/:orderId/pay  (crea intent) */
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
  async (req: AuthReq, res) => {
    try {
      const out = await Svc.createPaymentIntent({
        userId: req.user!.sub,
        orderId: req.params.orderId,
        method: req.body.method,                 // opcional
        paymentMethodId: req.body.paymentMethodId, // opcional
        provider: req.body.provider,             // opcional
      });
      res.status(201).json(out);
    } catch (e:any) { res.status(e.status || 400).json({ error: e.message }); }
  }
);

/** POST /api/v1/payments/confirm  (confirmar tarjeta mock) */
router.post(
  '/confirm',
  requireAuth,
  requireRole('customer'),
  [ body('intentId').notEmpty(), body('succeed').isBoolean() ],
  validate,
  async (req: AuthReq, res) => {
    try {
      const out = await Svc.confirmCardPayment(req.user!.sub, req.body.intentId, Boolean(req.body.succeed));
      res.json(out);
    } catch (e:any) { res.status(e.status || 400).json({ error: e.message }); }
  }
);

/** POST /api/v1/payments/admin/:orderId/transfer/confirm  (admin confirma transferencia) */
router.post(
  '/admin/:orderId/transfer/confirm',
  requireAuth,
  requireRole('admin'),
  [ param('orderId').notEmpty() ],
  validate,
  async (req: AuthReq, res) => {
    try {
      const out = await Svc.adminConfirmTransfer(req.params.orderId);
      res.json(out);
    } catch (e:any) { res.status(e.status || 400).json({ error: e.message }); }
  }
);

/** POST /api/v1/payments/admin/:orderId/cod/paid  (admin marca COD pagado) */
router.post(
  '/admin/:orderId/cod/paid',
  requireAuth,
  requireRole('admin'),
  [ param('orderId').notEmpty() ],
  validate,
  async (req: AuthReq, res) => {
    try {
      const out = await Svc.adminMarkCodPaid(req.params.orderId);
      res.json(out);
    } catch (e:any) { res.status(e.status || 400).json({ error: e.message }); }
  }
);

export default router;
