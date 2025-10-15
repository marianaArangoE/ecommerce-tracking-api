import { Router } from "express";
import { productRouter } from "./productRouter";
import usersRoutes from './../../domain/models/users/routes';

export const router = Router();

router.use('/users', usersRoutes);
router.use('/products', productRouter);