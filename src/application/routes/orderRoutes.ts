// src/application/routes/orderRoutes.ts
import { Router } from 'express';
import { schemaValidator } from '../middlewares/validatorHandler';
import { requireAuth, requireAnyRole, requireRole } from '../middlewares/auth';
import * as Controller from '../controllers/orderController';
import {
  confirmOrderSchema,
  advanceStatusSchema,
  cancelOrderSchema,
  adminAutoCancelSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
  adminSummaryQuerySchema,
  adminTopProductsQuerySchema,
  adminDailyQuerySchema,
} from '../schemas/orderSchemaJoi';

const router = Router();

/* ============================================================
 *                    RUTAS ADMIN (REPORTES)
 *  (DEBEN IR ANTES DE '/:orderId' PARA EVITAR COLISIONES)
 * ============================================================ */

/** GET /api/v1/orders/admin/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 *  Conteo por estado y revenue (solo paid) en rango.
 */
router.get(
  '/admin/summary',
  requireAuth,
  requireRole('admin'),
  schemaValidator('query', adminSummaryQuerySchema),
  Controller.adminSummary
);

/** GET /api/v1/orders/admin/top-products?limit=10
 *  Productos top por unidades y ventas.
 */
router.get(
  '/admin/top-products',
  requireAuth,
  requireRole('admin'),
  schemaValidator('query', adminTopProductsQuerySchema),
  Controller.adminTopProducts
);

/** GET /api/v1/orders/admin/daily?days=14
 *  Serie diaria de pedidos y ventas pagadas.
 */
router.get(
  '/admin/daily',
  requireAuth,
  requireRole('admin'),
  schemaValidator('query', adminDailyQuerySchema),
  Controller.adminDaily
);

/** POST /api/v1/orders/admin/auto-cancel { hours? }
 *  Auto-cancela PENDIENTE > N horas (default 48)
 */
router.post(
  '/admin/auto-cancel',
  requireAuth,
  requireRole('admin'),
  schemaValidator('body', adminAutoCancelSchema),
  Controller.adminAutoCancel
);

/* ============================================================
 *                 FLUJO DE ÓRDENES (CUSTOMER/ADMIN)
 * ============================================================ */

/** POST /api/v1/orders/confirm
 *  Confirmar pedido desde un checkout (solo customer).
 */
router.post(
  '/confirm',
  requireAuth,
  requireRole('customer'),
  schemaValidator('body', confirmOrderSchema),
  Controller.confirm
);

/** POST /api/v1/orders/:orderId/status
 *  Avanzar estado (admin): PENDIENTE → PROCESANDO → COMPLETADA
 */
router.post(
  '/:orderId/status',
  requireAuth,
  requireRole('admin'),
  schemaValidator('params', orderIdParamSchema),
  schemaValidator('body', advanceStatusSchema),
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
  schemaValidator('params', orderIdParamSchema),
  schemaValidator('body', cancelOrderSchema),
  Controller.cancel
);

/** GET /api/v1/orders/:orderId
 *  Ver una orden:
 *   - customer: solo propias
 *   - admin: puede ver cualquiera
 */
router.get(
  '/:orderId',
  requireAuth,
  requireAnyRole(['customer', 'admin']),
  schemaValidator('params', orderIdParamSchema),
  Controller.get
);

/** GET /api/v1/orders
 *  Listar órdenes:
 *   - customer: sus propias (opcional filtro status)
 *   - admin: todas (opcional filtro status)
 */
router.get(
  '/',
  requireAuth,
  requireAnyRole(['customer', 'admin']),
  schemaValidator('query', listOrdersQuerySchema),
  Controller.list
);

export default router;
