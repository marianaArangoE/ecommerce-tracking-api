import { Response } from 'express';
import { AuthReq } from '../middlewares/auth';
import * as OrderService from '../../domain/services/orderService';
import { OrderModel } from '../../domain/models/orders/orderModel';

export const adminSummary = async (req: AuthReq, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date('1970-01-01');
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  const match: any = { createdAt: { $gte: from.toISOString(), $lte: to.toISOString() } };

  const [byStatus, revenue] = await Promise.all([
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
    byStatus: byStatus.map((x) => ({ status: x._id, count: x.count })),
    revenueCents: revenue[0]?.totalCents ?? 0,
  });
};

export const adminTopProducts = async (req: AuthReq, res: Response) => {
  const limit = Math.min(Number(req.query.limit || 10), 100);

  const rows = await OrderModel.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        sku: { $first: '$items.sku' },
        units: { $sum: '$items.quantity' },
        salesCents: { $sum: '$items.totalCents' },
      },
    },
    { $sort: { units: -1 } },
    { $limit: limit },
  ]);

  res.json({ items: rows });
};

export const adminDaily = async (req: AuthReq, res: Response) => {
  const days = Math.max(1, Math.min(Number(req.query.days || 14), 180));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = await OrderModel.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $project: {
        day: { $substr: ['$createdAt', 0, 10] },
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
};

export const adminAutoCancel = async (req: AuthReq, res: Response) => {
  const hours = Number(req.body?.hours || 48);
  const out = await OrderService.autoCancelStalePending(hours);
  res.json(out);
};

export const confirm = async (req: AuthReq, res: Response) => {
  try {
    const { checkoutId, email } = req.body || {};
    if (!checkoutId || !email) return res.status(400).json({ error: 'checkoutId y email son requeridos' });
    const order = await OrderService.confirmOrder({ userId: req.user!.sub, checkoutId, email });
    res.status(201).json(order);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

export const advanceStatus = async (req: AuthReq, res: Response) => {
  try {
    const out = await OrderService.advanceOrderStatus(req.params.orderId, req.body.status);
    res.json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

export const cancel = async (req: AuthReq, res: Response) => {
  try {
    const out = await OrderService.cancelOrder(req.params.orderId, {
      role: req.user!.role,
      userId: req.user!.sub,
      reason: req.body.reason,
    });
    res.json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

export const get = async (req: AuthReq, res: Response) => {
  try {
    if (req.user!.role === 'admin') {
      const ord = await OrderModel.findOne({ orderId: req.params.orderId }).lean();
      if (!ord) return res.status(404).json({ error: 'Orden no encontrada' });
      return res.json(ord);
    }
    const data = await OrderService.getMyOrder(req.user!.sub, req.params.orderId);
    res.json(data);
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
};

export const list = async (req: AuthReq, res: Response) => {
  try {
    const status = (req.query.status as any) || undefined;
    if (req.user!.role === 'admin') {
      const q: any = {};
      if (status) q.status = status;
      const items = await OrderModel.find(q).sort({ createdAt: -1 }).limit(200).lean();
      return res.json({ items, total: items.length });
    }
    const data = await OrderService.listMyOrders(req.user!.sub, status);
    res.json({ items: data, total: data.length });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

