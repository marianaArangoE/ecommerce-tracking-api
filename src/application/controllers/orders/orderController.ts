import { Response, NextFunction } from "express";
import {
  confirmOrder,
  getMyOrder,
  listMyOrders,
  adminListOrders,
  cancelOrder,
  autoCancelStalePending,
  advanceOrderStatus,
  getOrderTracking,
  updateOrderTrackingStatus,
  customerConfirmDelivery, 
} from "../../../domain/services/orderService";

import { OrderStatus } from "../../../domain/models/orders/orderStatus";
import {
  emitOrderTracking,
  emitOrderCustomerConfirmed,
} from "../../../infrastructure/websockets/socket.gateway";
import { AuthReq } from "../../middlewares/auth";   

export class OrdersController {
  create = async (req: AuthReq, res: Response, next: NextFunction) => {
    try {
      const order = await confirmOrder({
        userId: req.user!.sub,
        checkoutId: req.body.checkoutId,
        email: req.body.email,
      });
      res.status(201).json(order);
    } catch (e) { next(e); }
  };

  getById = async (req: AuthReq, res: Response, next: NextFunction) => {
    try {
      const order = await getMyOrder(req.user!.sub, req.params.id);
      res.json(order);
    } catch (e) { next(e); }
  };

  listMine = async (req: AuthReq, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as any;
      const orders = await listMyOrders(req.user!.sub, status);
      res.json(orders);
    } catch (e) { next(e); }
  };


  getTracking = async (req: AuthReq, res: Response, next: NextFunction) => {
    try {
      const orderId = (req.params as any).orderId ?? req.params.id;
      const data = await getOrderTracking(orderId);
      res.json(data);
    } catch (e) { next(e); }
  };


  updateTracking = async (req: AuthReq, res: Response, next: NextFunction) => {
    try {
      const orderId = (req.params as any).orderId ?? req.params.id;
      const { status } = req.body as { status: OrderStatus };

      if (!Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({ error: "status inválido" });
      }

      const updated = await updateOrderTrackingStatus(orderId, status, req.user!.sub);

      emitOrderTracking({
        orderId: updated.orderId,
        trackingStatus: updated.trackingStatus,
        trackingHistory: updated.trackingHistory,
      });

      res.json(updated);
    } catch (e) { next(e); }
  };


  confirmDelivery = async (req: AuthReq, res: Response, next: NextFunction) => {
    try {
      const orderId = (req.params as any).orderId ?? req.params.id;

      const updated = await customerConfirmDelivery(req.user!.sub, orderId);


      emitOrderTracking({
        orderId: updated.orderId,
        trackingStatus: updated.trackingStatus,
        trackingHistory: updated.trackingHistory,
      });
      emitOrderCustomerConfirmed({
        orderId: updated.orderId,
        userId: req.user!.sub,
        at: new Date().toISOString(),
      });

      res.json({ ok: true, order: updated });
    } catch (e) { next(e); }
  };
}
