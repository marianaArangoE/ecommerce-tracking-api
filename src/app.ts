import express from 'express';
import usersRoutes from './modules/users/routes';
// import productsRoutes from './modules/products/routes';
// import ordersRoutes from './modules/orders/routes';
// import shipmentsRoutes from './modules/shipments/routes';
// import notificationsRoutes from './modules/notifications/routes';

export const app = express();
app.use(express.json());        
app.use('/api/v1/users', usersRoutes);
// app.use('/api/v1/products', productsRoutes);
// app.use('/api/v1/orders', ordersRoutes);
// app.use('/api/v1/shipments', shipmentsRoutes);
// app.use('/api/v1/notifications', notificationsRoutes);
