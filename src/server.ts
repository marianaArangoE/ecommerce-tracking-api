// src/server.ts
import { app } from './app';
import { boomErrorHandler, genericErrorHandler } from './application/middlewares/errorHandle';

const PORT = Number(process.env.PORT ?? 3000);
app.use(boomErrorHandler)
app.use(genericErrorHandler)
const server = app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

// Manejo básico de errores no controlados
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Cierre elegante (Ctrl+C / kill)
process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});
