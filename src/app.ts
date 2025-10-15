import express from 'express';
import usersRoutes from './domain/models/users/routes';
import cartsRouter from './domain/models/shippingCart/routes';
import checkoutRoutes from './domain/models/checkout/routes';
import ordersRoutes from './domain/models/orders/routes';

export const app = express();
app.use(express.json());

app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/carts', cartsRouter);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/orders', ordersRoutes);

