import express from 'express';
import { userRouter as usersRoutes } from './application/routes/userRoutes';
import cartsRouter from './application/routes/shippingCartRoutes';
import checkoutRoutes from './application/routes/checkoutRoutes';
import ordersRoutes from './application/routes/orderRoutes';
import paymentsRoutes from './application/routes/paymentsRoutes';
import { productRouter } from './application/routes/productRoutes';

export const app = express();
app.use(express.json());
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/carts', cartsRouter);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/products',productRouter);
