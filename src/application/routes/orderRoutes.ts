// src/application/routes/orderRoutes.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middlewares/validate';
import { requireAuth, requireAnyRole, requireRole } from '../middlewares/auth';
import * as Controller from '../controllers/orderController';

const router = Router();

/* ============================================================
 *                    RUTAS ADMIN (REPORTES)
 *  (DEBEN IR ANTES DE '/:orderId' PARA EVITAR COLISIONES)
 * ============================================================ */

/** GET /api/v1/orders/admin/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 *  Conteo por estado y revenue (solo paid) en rango.
 */
router.get('/admin/summary', requireAuth, requireRole('admin'), Controller.adminSummary);

/** GET /api/v1/orders/admin/top-products?limit=10
 *  Productos top por unidades y ventas.
 */
router.get('/admin/top-products', requireAuth, requireRole('admin'), Controller.adminTopProducts);

/** GET /api/v1/orders/admin/daily?days=14
 *  Serie diaria de pedidos y ventas pagadas.
 */
router.get('/admin/daily', requireAuth, requireRole('admin'), Controller.adminDaily);

/** POST /api/v1/orders/admin/auto-cancel { hours? }
 *  Auto-cancela PENDIENTE > N horas (default 48)
 */
router.post(
  '/admin/auto-cancel',
  requireAuth,
  requireRole('admin'),
  [body('hours').optional().isInt({ min: 1, max: 168 })],
  validate,
  Controller.adminAutoCancel
);

/* ============================================================
 *                 FLUJO DE ÓRDENES (CUSTOMER/ADMIN)
 * ============================================================ */

/** POST /api/v1/orders/confirm
 *  Confirmar pedido desde un checkout (solo customer).
 */
router.post('/confirm', requireAuth, requireRole('customer'), Controller.confirm);

/** POST /api/v1/orders/:orderId/status
 *  Avanzar estado (admin): PENDIENTE → PROCESANDO → COMPLETADA
 */
router.post(
  '/:orderId/status',
  requireAuth,
  requireRole('admin'),
  [param('orderId').notEmpty(), body('status').isIn(['PROCESANDO', 'COMPLETADA'])],
  validate,
  Controller.advanceStatus
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
  Controller.cancel
);

/** GET /api/v1/orders/:orderId
 *  Ver una orden:
 *   - customer: solo propias
 *   - admin: puede ver cualquiera
 */
router.get('/:orderId', requireAuth, requireAnyRole(['customer', 'admin']), Controller.get);

/** GET /api/v1/orders
 *  Listar órdenes:
 *   - customer: sus propias (opcional filtro status)
 *   - admin: todas (opcional filtro status)
 */
router.get('/', requireAuth, requireAnyRole(['customer', 'admin']), Controller.list);

export default router;

