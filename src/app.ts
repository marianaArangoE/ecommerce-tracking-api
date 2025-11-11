import express from 'express';
import usersRoutes from './domain/models/users/routes';
import cartsRouter from './domain/models/shippingCart/shippingCartRoutes';
import checkoutRoutes from './domain/models/checkout/checkoutRoutes';
import ordersRoutes from './domain/models/orders/routes';
import paymentsRoutes from './domain/models/payments/routes';
import { productRouter } from './application/routes/productRoutes';

export const app = express();
app.use(express.json());
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/carts', cartsRouter);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/products',productRouter);
