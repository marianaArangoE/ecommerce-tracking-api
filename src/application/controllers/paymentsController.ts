import { Response } from 'express';
import { AuthReq } from '../middlewares/auth';
import * as Svc from '../../domain/services/paymentsServices';

export const listMyMethods = async (req: AuthReq, res: Response) => {
  const items = await Svc.listMyMethods(req.user!.sub);
  res.json({ items, total: items.length });
};

export const addMethod = async (req: AuthReq, res: Response) => {
  try {
    const out = await Svc.addMethod(req.user!.sub, {
      type: req.body.type,
      provider: req.body.provider,
      cardNumber: req.body.cardNumber,
      setDefault: req.body.setDefault,
    });
    res.status(201).json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

export const setDefault = async (req: AuthReq, res: Response) => {
  try {
    const out = await Svc.setDefault(req.user!.sub, req.params.id);
    res.json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

export const removeMethod = async (req: AuthReq, res: Response) => {
  try {
    const out = await Svc.removeMethod(req.user!.sub, req.params.id);
    res.json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

export const createPaymentIntent = async (req: AuthReq, res: Response) => {
  try {
    const out = await Svc.createPaymentIntent({
      userId: req.user!.sub,
      orderId: req.params.orderId,
      method: req.body.method,
      paymentMethodId: req.body.paymentMethodId,
      provider: req.body.provider,
    });
    res.status(201).json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

export const confirmCardPayment = async (req: AuthReq, res: Response) => {
  try {
    const out = await Svc.confirmCardPayment(
      req.user!.sub,
      req.body.intentId,
      Boolean(req.body.succeed)
    );
    res.json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

export const adminConfirmTransfer = async (req: AuthReq, res: Response) => {
  try {
    const out = await Svc.adminConfirmTransfer(req.params.orderId);
    res.json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

export const adminMarkCodPaid = async (req: AuthReq, res: Response) => {
  try {
    const out = await Svc.adminMarkCodPaid(req.params.orderId);
    res.json(out);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message });
  }
};

