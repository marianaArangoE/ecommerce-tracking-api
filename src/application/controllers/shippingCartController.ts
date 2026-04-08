import { Response } from 'express';
import { AuthReq } from '../middlewares/auth';
import * as CartService from '../../domain/services/shippingCartService';

export const getMyCart = async (req: AuthReq, res: Response) => {
  try {
    const cart = await CartService.getMyCart(req.user!.sub);
    res.json(cart);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'CART_GET_ERROR' });
  }
};

export const addItem = async (req: AuthReq, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await CartService.addItem({ userId: req.user!.sub, productId, quantity: Number(quantity) });
    res.status(201).json(cart);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'CART_ADD_ERROR' });
  }
};

export const setItemQuantity = async (req: AuthReq, res: Response) => {
  try {
    const quantity = Number(req.body.quantity);
    const cart = await CartService.setItemQuantity({
      userId: req.user!.sub,
      productId: req.params.productId,
      quantity,
    });
    res.json(cart);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'CART_SET_QTY_ERROR' });
  }
};

export const removeItem = async (req: AuthReq, res: Response) => {
  try {
    const cart = await CartService.removeItem({ userId: req.user!.sub, productId: req.params.productId });
    res.json(cart);
  } catch (e: any) {
    res.status(e.status || 400).json({ error: e.message || 'CART_REMOVE_ERROR' });
  }
};

