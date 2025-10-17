import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireRole, requireAnyRole, AuthReq } from '../../../application/middlewares/auth';
import { validate } from '../../../application/middlewares/validate';
import * as Svc from './services'; 

const router = Router();
// todas las rutas requieren auth y rol customer o admin
router.get(
  '/methods',
  requireAuth,
  requireRole('customer'),
  async (req: AuthReq, res) => {
    const items = await Svc.listMyMethods(req.user!.sub);
    res.json({ items, total: items.length });
  }
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

//establecer metodo por defecto
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

//eliminar metodo de pago
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
  async (req: AuthReq, res) => {
    try {
      const out = await Svc.createPaymentIntent({
        userId: req.user!.sub,
        orderId: req.params.orderId,
        method: req.body.method,               
        paymentMethodId: req.body.paymentMethodId, 
        provider: req.body.provider,           
      });
      res.status(201).json(out);
    } catch (e:any) { res.status(e.status || 400).json({ error: e.message }); }
  }
);
//confirmar pago con tarjeta
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

// ADMIN: confirmar transferencia bancaria
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

// ADMIN: marcar COD como pagado
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
