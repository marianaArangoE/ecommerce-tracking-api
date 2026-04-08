// // src/tools/listenAdmin.ts
// import { io } from "socket.io-client";

// const URL = process.env.SOCKET_URL || "http://localhost:3000";
// const s = io(URL, { transports: ["websocket"] });

// s.on("connect", () => {
//   console.log("🧭 Admin conectado", s.id, "→", URL);
//   s.emit("admin:join");
// });

// s.on("admin:joined", () => console.log("✅ Admin suscrito a sala global"));

// s.on("order:tracking", (p) => console.log("📡 tracking:", p));
// s.on("order:customer-confirmed", (p) => console.log("✅ confirmado por cliente:", p));

// s.on("connect_error", (e) => console.error("❌ WS error:", e.message));
