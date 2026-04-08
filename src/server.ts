import "dotenv/config";
import http from "http";
import mongoose from "mongoose";
import { connectMongo } from "./infrastructure/config/mongoDB";
import { app } from "./app";
import { initSocket } from "./infrastructure/websockets/socket.gateway";
import {
  boomErrorHandler,
  genericErrorHandler,
  mongoErrorHandler,
} from "./application/middlewares/errorHandle";

const PORT = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecommerce";


const server = http.createServer(app);
initSocket(server);


app.get("/", (_req, res) => res.send("API Running OK ✅"));
app.get("/health/db", (_req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
  });
});


app.use(boomErrorHandler);
app.use(mongoErrorHandler);
app.use(genericErrorHandler);

(async () => {
  try {
    await connectMongo(mongoUri);
    console.log("[mongo] conexión exitosa");
    server.listen(PORT, () => console.log(`🚀 Server + WS on :${PORT}`));
  } catch (err) {
    console.error("[mongo] error de conexión:", err);
    process.exit(1);
  }
})();

process.on("SIGINT", async () => {
  console.log("\n[server] Apagando la apicita");
  await mongoose.disconnect();
  console.log("[mongo] disconnected (SIGINT)");
  process.exit(0);
});
