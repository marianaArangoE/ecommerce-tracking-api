import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo } from './infrastructure/config/mongoDB';
import { app } from './app';
import { boomErrorHandler, genericErrorHandler, mongoErrorHandler } from './application/middlewares/errorHandle';

const PORT = Number(process.env.PORT) || 3000;

app.use(boomErrorHandler)
app.use(mongoErrorHandler);
app.use(genericErrorHandler)

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommerce';


app.get('/', (_req, res) => res.send('API Running OK ✅'));
app.get('/health/db', (_req, res) => {
  res.json({ ok: mongoose.connection.readyState === 1, state: mongoose.connection.readyState });
});

(async () => {
  try {
    await connectMongo(mongoUri);
    console.log('[mongo] conexión exitosa');
    app.listen(PORT, () => console.log(`🚀 Server on :${PORT}`));
  } catch (err) {
    console.error('[mongo] error de conexión:', err);
    process.exit(1);
  }
})();

process.on('SIGINT', async () => {
  await mongoose.disconnect();
  console.log('[mongo] disconnected (SIGINT)');
  process.exit(0);
});
