// src/domain/models/orders/routes.ts
import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../application/middlewares/validate';
import { requireAuth, requireAnyRole, requireRole, AuthReq } from '../../../application/middlewares/auth';

import {
  confirmOrder,
  getMyOrder,
  listMyOrders,
  cancelOrder,
  autoCancelStalePending,
  advanceOrderStatus,
} from './service';
import { OrderModel } from './model';

const router = Router();

/* ============================================================
 *                    RUTAS ADMIN (REPORTES)
 *  (DEBEN IR ANTES DE '/:orderId' PARA EVITAR COLISIONES)
 * ============================================================ */

/** GET /api/v1/orders/admin/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 *  Conteo por estado y revenue (solo paid) en rango.
 */
router.get('/admin/summary', requireAuth, requireRole('admin'), async (req: AuthReq, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date('1970-01-01');
  const to   = req.query.to   ? new Date(String(req.query.to))   : new Date();

  const match: any = { createdAt: { $gte: from.toISOString(), $lte: to.toISOString() } };

  const [ byStatus, revenue ] = await Promise.all([
    OrderModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    OrderModel.aggregate([
      { $match: { ...match, paymentStatus: 'paid' } },
      { $group: { _id: null, totalCents: { $sum: '$totalCents' } } },
    ]),
  ]);

  res.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    byStatus: byStatus.map(x => ({ status: x._id, count: x.count })),
    revenueCents: revenue[0]?.totalCents ?? 0,
  });
});

/** GET /api/v1/orders/admin/top-products?limit=10
 *  Productos top por unidades y ventas.
 */
router.get('/admin/top-products', requireAuth, requireRole('admin'), async (req: AuthReq, res: Response) => {
  const limit = Math.min(Number(req.query.limit || 10), 100);

  const rows = await OrderModel.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        sku:  { $first: '$items.sku' },
        units: { $sum: '$items.quantity' },
        salesCents: { $sum: '$items.totalCents' },
      },
    },
    { $sort: { units: -1 } },
    { $limit: limit },
  ]);

  res.json({ items: rows });
});

/** GET /api/v1/orders/admin/daily?days=14
 *  Serie diaria de pedidos y ventas pagadas.
 */
router.get('/admin/daily', requireAuth, requireRole('admin'), async (req: AuthReq, res: Response) => {
  const days = Math.max(1, Math.min(Number(req.query.days || 14), 180));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = await OrderModel.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $project: {
        day: { $substr: ['$createdAt', 0, 10] }, // 'YYYY-MM-DD'
        totalCents: 1,
        paymentStatus: 1,
      },
    },
    {
      $group: {
        _id: '$day',
        orders: { $sum: 1 },
        paidCents: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalCents', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ items: rows });
});

/** POST /api/v1/orders/admin/auto-cancel { hours? }
 *  Auto-cancela PENDIENTE > N horas (default 48)
 */
router.post(
  '/admin/auto-cancel',
  requireAuth,
  requireRole('admin'),
  [body('hours').optional().isInt({ min: 1, max: 168 })],
  validate,
  async (req: AuthReq, res: Response) => {
    const hours = Number(req.body?.hours || 48);
    const out = await autoCancelStalePending(hours);
    res.json(out);
  }
);

/* ============================================================
 *                 FLUJO DE ÓRDENES (CUSTOMER/ADMIN)
 * ============================================================ */

/** POST /api/v1/orders/confirm
 *  Confirmar pedido desde un checkout (solo customer).
 */
router.post('/confirm', requireAuth, requireRole('customer'), async (req: AuthReq, res: Response) => {
  try {
    const { checkoutId, email } = req.body || {};
    if (!checkoutId || !email) return res.status(400).json({ error: 'checkoutId y email son requeridos' });
    const order = await confirmOrder({ userId: req.user!.sub, checkoutId, email });
    res.status(201).json(order);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/** POST /api/v1/orders/:orderId/status
 *  Avanzar estado (admin): PENDIENTE → PROCESANDO → COMPLETADA
 */
router.post(
  '/:orderId/status',
  requireAuth,
  requireRole('admin'),
  [param('orderId').notEmpty(), body('status').isIn(['PROCESANDO', 'COMPLETADA'])],
  validate,
  async (req: AuthReq, res: Response) => {
    try {
      const out = await advanceOrderStatus(req.params.orderId, req.body.status);
      res.json(out);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message });
    }
  }
);

/** POST /api/v1/orders/:orderId/cancel
 *  Cancelar orden:
 *   - Admin: cualquiera si está PENDIENTE
 *   - Customer: solo propia si está PENDIENTE
 */
router.post(
  '/:orderId/cancel',
  requireAuth,
  requireAnyRole(['customer', 'admin']),
  [param('orderId').notEmpty(), body('reason').optional().isString()],
  validate,
  async (req: AuthReq, res: Response) => {
    try {
      const out = await cancelOrder(req.params.orderId, {
        role: req.user!.role,
        userId: req.user!.sub,
        reason: req.body.reason,
      });
      res.json(out);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message });
    }
  }
);

/** GET /api/v1/orders/:orderId
 *  Ver una orden:
 *   - customer: solo propias
 *   - admin: puede ver cualquiera
 */
router.get('/:orderId', requireAuth, requireAnyRole(['customer', 'admin']), async (req: AuthReq, res: Response) => {
  try {
    if (req.user!.role === 'admin') {
      const ord = await OrderModel.findOne({ orderId: req.params.orderId }).lean();
      if (!ord) return res.status(404).json({ error: 'Orden no encontrada' });
      return res.json(ord);
    }
    const data = await getMyOrder(req.user!.sub, req.params.orderId);
    res.json(data);
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

/** GET /api/v1/orders
 *  Listar órdenes:
 *   - customer: sus propias (opcional filtro status)
 *   - admin: todas (opcional filtro status)
 */
router.get('/', requireAuth, requireAnyRole(['customer', 'admin']), async (req: AuthReq, res: Response) => {
  try {
    const status = (req.query.status as any) || undefined;
    if (req.user!.role === 'admin') {
      const q: any = {};
      if (status) q.status = status;
      const items = await OrderModel.find(q).sort({ createdAt: -1 }).limit(200).lean();
      return res.json({ items, total: items.length });
    }
    const data = await listMyOrders(req.user!.sub, status);
    res.json({ items: data, total: data.length });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
