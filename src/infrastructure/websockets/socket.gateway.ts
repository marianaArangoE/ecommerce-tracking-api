import { Server } from "socket.io";
import { OrderStatus } from "../../domain/models/orders/orderStatus";

let ioRef: Server | null = null;

const roomOrder = (orderId: string) => `order:${orderId}`;
const roomAdmins = "admins";

export function initSocket(server: any) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH"] },
  });

  io.on("connection", (socket) => {
    console.log(`[WS] connected: ${socket.id}`);


    socket.on("order:join", ({ orderId }: { orderId: string }) => {
      if (!orderId) return;
      const r = roomOrder(orderId);
      socket.join(r);
      console.log(`[WS] ${socket.id} joined ${r}`);
      socket.emit("order:joined", { orderId });
    });


    socket.on("admin:join", () => {
      socket.join(roomAdmins);
      console.log(`[WS] ${socket.id} joined ${roomAdmins}`);
      socket.emit("admin:joined", { ok: true });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[WS] disconnected: ${socket.id} (${reason})`);
    });
  });

  ioRef = io;
  console.log("[WS] Socket.IO initialized");
  return io;
}

export type TrackingHistoryItem = {
  at: Date | string;
  status: OrderStatus;
  by?: string;
};

export type TrackingEventPayload = {
  orderId: string;
  trackingStatus: OrderStatus;
  trackingHistory: TrackingHistoryItem[];
};

export type CustomerConfirmedPayload = {
  orderId: string;
  userId: string;
  at: string; 
};


export function emitOrderTracking(payload: TrackingEventPayload) {
  if (!ioRef) return console.warn("[WS] emitOrderTracking called but ioRef is null");
  const r = roomOrder(payload.orderId);
  console.log(`[WS] Emitting order:tracking → ${r} :: ${payload.trackingStatus}`);
  ioRef.to(r).emit("order:tracking", payload);
}

export function emitOrderCustomerConfirmed(payload: CustomerConfirmedPayload) {
  if (!ioRef) return console.warn("[WS] emitOrderCustomerConfirmed called but ioRef is null");
  console.log(`[WS] Emitting order:customer-confirmed → ${roomAdmins} :: ${payload.orderId}`);
  ioRef.to(roomAdmins).emit("order:customer-confirmed", payload);
}
