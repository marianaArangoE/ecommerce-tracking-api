import { Response } from 'express';
import { AuthReq } from '../middlewares/auth';
import * as CheckoutService from '../../domain/services/checkoutService';

export const createCheckout = async (req: AuthReq, res: Response) => {
  try {
    const userId = req.user!.sub;
    const checkout = await CheckoutService.createCheckout({
      userId,
      addressId: req.body.addressId,
      shippingMethod: req.body.shippingMethod,
      paymentMethod: req.body.paymentMethod,
    });
    res.status(201).json(checkout);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

export const getCheckout = async (req: AuthReq, res: Response) => {
  try {
    const userId = req.user!.sub;
    const checkout = await CheckoutService.getCheckout(userId, req.params.id);
    res.json(checkout);
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
};

