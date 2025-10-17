// =================================================================
// ARCHIVO DE RUTAS DE ÓRDENES (Corregido para modelo Vendedor)
// =================================================================
import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../../../application/middlewares/validate';
import { requireAuth, requireAnyRole, requireRole, AuthReq } from '../../../application/middlewares/auth';
import { ProductModel } from '../products/model'; // Se necesita para verificar permisos
import { OrderModel } from './model';
import {
  confirmOrder,
  getMyOrder,
  listMyOrders,
  cancelOrder,
  advanceOrderStatus,
} from './service';

const router = Router();

/* ============================================================
 * EL PANEL DEL VENDEDOR (RUTAS SOLO PARA ADMINS/VENDEDORES)
 * ============================================================ */

/**
 * Reporte de Resumen: ¿Cómo van MIS ventas?
 * Devuelve un conteo y ganancias de las órdenes que contienen productos de este vendedor.
 */
router.get('/admin/summary', requireAuth, requireRole('admin'), async (req: AuthReq, res: Response) => {
  // 1. Obtenemos la lista de IDs de los productos de este vendedor.
  const myProductIds = await ProductModel.find({ vendorId: req.user!.sub }, '_id').lean();
  const myProductIdStrings = myProductIds.map(p => p._id.toString());
  
  const from = req.query.from ? new Date(String(req.query.from)) : new Date('1970-01-01');
  const to   = req.query.to   ? new Date(String(req.query.to))   : new Date();

  // 2. Creamos un filtro base para usar solo en las órdenes que nos interesan.
  const match: any = { 
    createdAt: { $gte: from.toISOString(), $lte: to.toISOString() },
    'items.productId': { $in: myProductIdStrings } // ¡El filtro clave!
  };

  // El resto de la lógica es igual, pero ahora opera solo sobre los datos filtrados.
  const [ byStatus, revenue ] = await Promise.all([
    OrderModel.aggregate([ { $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } } ]),
    OrderModel.aggregate([ { $match: { ...match, paymentStatus: 'paid' } }, { $group: { _id: null, totalCents: { $sum: '$totalCents' } } } ]),
  ]);

  res.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    byStatus: byStatus.map(x => ({ status: x._id, count: x.count })),
    revenueCents: revenue[0]?.totalCents ?? 0,
  });
});


/* NOTA: La ruta '/admin/auto-cancel' se ha eliminado.
 * En un modelo multi-vendedor, no tiene sentido que un vendedor pueda
 * cancelar las órdenes de otros. Esta tarea debería ser un proceso
 * automático del sistema, no un endpoint de admin.
 */


/* ============================================================
 * EL MOSTRADOR DE SERVICIO (FLUJO PARA CLIENTES Y VENDEDORES)
 * ============================================================ */

/**
 * [CLIENTE] Confirma un checkout y lo convierte en una orden oficial.
 * Esta lógica no cambia, es solo para clientes.
 */
router.post('/confirm', requireAuth, requireRole('customer'), async (req: AuthReq, res: Response) => {
  // ... (sin cambios)
});


/**
 * [VENDEDOR] Avanza el estado de una orden.
 * El servicio se encargará de verificar si el vendedor tiene permiso sobre esta orden.
 */
router.post('/:orderId/status',
  requireAuth, requireRole('admin'),
  [param('orderId').notEmpty(), body('status').isIn(['PROCESANDO', 'COMPLETADA'])], validate,
  async (req: AuthReq, res: Response) => {
    try {
      // Pasamos el ID del vendedor al servicio para que verifique el permiso.
      const out = await advanceOrderStatus(req.params.orderId, req.body.status, req.user!.sub);
      res.json(out);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message });
    }
  }
);

/**
 * [CLIENTE/VENDEDOR] Cancela una orden.
 * El servicio aplicará las reglas según el rol.
 */
router.post('/:orderId/cancel',
  requireAuth, requireAnyRole(['customer', 'admin']),
  [param('orderId').notEmpty()], validate,
  async (req: AuthReq, res: Response) => {
    try {
      const out = await cancelOrder(req.params.orderId, { role: req.user!.role, userId: req.user!.sub });
      res.json(out);
    } catch (e: any) {
      res.status(e.status || 400).json({ error: e.message });
    }
  }
);


/**
 * [CLIENTE/VENDEDOR] Ver una orden específica.
 */
router.get('/:orderId', requireAuth, requireAnyRole(['customer', 'admin']), async (req: AuthReq, res: Response) => {
  try {
    // Si es cliente, el servicio le protege.
    if (req.user!.role === 'customer') {
      const data = await getMyOrder(req.user!.sub, req.params.orderId);
      return res.json(data);
    }
    
    // Si es vendedor, verificamos su permiso.
    const order = await OrderModel.findOne({ orderId: req.params.orderId }).lean();
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    
    const productIdsInOrder = order.items.map(item => item.productId);
    const count = await ProductModel.countDocuments({
      _id: { $in: productIdsInOrder },
      vendorId: req.user!.sub
    });

    if (count === 0) return res.status(403).json({ error: 'No tienes permiso para ver esta orden' });

    return res.json(order);

  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});


/**
 * [CLIENTE/VENDEDOR] Listar órdenes.
 */
router.get('/', requireAuth, requireAnyRole(['customer', 'admin']), async (req: AuthReq, res: Response) => {
  try {
    // La lógica para el cliente no cambia.
    if (req.user!.role === 'customer') {
      const data = await listMyOrders(req.user!.sub, (req.query.status as any));
      return res.json({ items: data, total: data.length });
    }
    
    // Lógica para el Vendedor:
    // 1. Obtener los IDs de sus productos.
    const myProductIds = await ProductModel.find({ vendorId: req.user!.sub }, '_id').lean();
    const myProductIdStrings = myProductIds.map(p => p._id.toString());
    
    // 2. Crear la consulta filtrando por sus productos.
    const query: any = { 'items.productId': { $in: myProductIdStrings } };
    if (req.query.status) query.status = req.query.status;

    // 3. Ejecutar la búsqueda.
    const items = await OrderModel.find(query).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ items, total: items.length });

  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;