import { io } from "socket.io-client";

const ORDER_ID = process.argv[2] || process.env.ORDER_ID || "ORD-20251111-6LAZL";
const URL = process.env.SOCKET_URL || "http://localhost:3000";


const socket = io(URL, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log(`🔌 Conectado como ${socket.id} → ${URL}`);
  socket.emit("order:join", { orderId: ORDER_ID });
  console.log(`🎧 Suscrito a order:${ORDER_ID}`);
});

socket.on("order:tracking", (payload) => {
  console.log(`📦 [${new Date().toLocaleTimeString()}] Actualización:`);
  console.log(`🆔 Orden: ${payload.orderId}`);
  console.log(`📍 Estado: ${payload.trackingStatus}`);
  console.log(`📜 Historial:`, payload.trackingHistory);
  console.log("─────────────────────────────");
});

socket.on("connect_error", (err) => {
  console.error("❌ Error de conexión:", err.message);
});

process.on("SIGINT", () => {
  console.log("\n👋 Cerrando suscriptor…");
  socket.disconnect();
  process.exit(0);
});
