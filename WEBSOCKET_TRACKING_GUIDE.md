# Guía: WebSocket para Seguimiento en Vivo de Órdenes

## 📋 Tabla de Contenidos
1. [Cómo Funciona el Sistema](#cómo-funciona-el-sistema)
2. [Arquitectura del Backend](#arquitectura-del-backend)
3. [Implementación en el Frontend](#implementación-en-el-frontend)
4. [Estados de Seguimiento](#estados-de-seguimiento)
5. [Ejemplos Completos](#ejemplos-completos)

---

## 🔧 Cómo Funciona el Sistema

### Flujo General

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Socket.IO)                      │
│                                                              │
│  1. Servidor escucha en puerto 3000                         │
│  2. Cliente se conecta → socket.id generado                 │
│  3. Cliente se une a sala: "order:ORD-123"                  │
│  4. Cuando hay actualización → emite evento a la sala      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Cliente)                       │
│                                                              │
│  1. Conecta a WebSocket                                     │
│  2. Se suscribe a "order:ORD-123"                          │
│  3. Escucha evento "order:tracking"                         │
│  4. Actualiza UI en tiempo real                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura del Backend

### 1. Inicialización del Servidor WebSocket

```typescript
// src/server.ts
import { initSocket } from "./infrastructure/websockets/socket.gateway";

const server = http.createServer(app);
initSocket(server); // ← Inicializa Socket.IO
```

### 2. Gateway de WebSocket

```typescript
// src/infrastructure/websockets/socket.gateway.ts

// Salas (rooms):
// - "order:ORD-123" → Para clientes siguiendo una orden específica
// - "admins" → Para administradores (reciben todas las actualizaciones)

export function initSocket(server: any) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH"] },
  });

  io.on("connection", (socket) => {
    // Cliente se conecta
    console.log(`[WS] connected: ${socket.id}`);

    // Cliente se une a una orden específica
    socket.on("order:join", ({ orderId }: { orderId: string }) => {
      if (!orderId) return;
      const room = `order:${orderId}`;
      socket.join(room);
      socket.emit("order:joined", { orderId });
    });

    // Admin se une a sala global
    socket.on("admin:join", () => {
      socket.join("admins");
      socket.emit("admin:joined", { ok: true });
    });
  });

  return io;
}
```

### 3. Emisión de Eventos

El backend emite eventos cuando:
- Se actualiza el estado de tracking de una orden
- El cliente confirma la entrega

```typescript
// Función para emitir actualizaciones de tracking
export function emitOrderTracking(payload: TrackingEventPayload) {
  const room = `order:${payload.orderId}`;
  ioRef.to(room).emit("order:tracking", payload);
}

// Función para notificar a admins cuando cliente confirma entrega
export function emitOrderCustomerConfirmed(payload: CustomerConfirmedPayload) {
  ioRef.to("admins").emit("order:customer-confirmed", payload);
}
```

### 4. Cuándo se Emiten los Eventos

Los eventos se emiten desde los controladores cuando:

```typescript
// src/application/controllers/orders/orderController.ts

// 1. Admin actualiza estado de tracking
updateTracking = async (req, res) => {
  const updated = await updateOrderTrackingStatus(orderId, status, userId);
  
  emitOrderTracking({
    orderId: updated.orderId,
    trackingStatus: updated.trackingStatus,
    trackingHistory: updated.trackingHistory,
  });
};

// 2. Cliente confirma entrega
confirmDelivery = async (req, res) => {
  const updated = await customerConfirmDelivery(userId, orderId);
  
  emitOrderTracking({
    orderId: updated.orderId,
    trackingStatus: updated.trackingStatus,
    trackingHistory: updated.trackingHistory,
  });
  
  emitOrderCustomerConfirmed({
    orderId: updated.orderId,
    userId: req.user!.sub,
    at: new Date().toISOString(),
  });
};
```

---

## 💻 Implementación en el Frontend

### 1. Instalación

```bash
npm install socket.io-client
# o
yarn add socket.io-client
```

### 2. Tipos TypeScript

```typescript
// types/websocket.ts

export enum OrderStatus {
  PREPARANDO_PEDIDO = "PREPARANDO_PEDIDO",
  ENVIANDO_A_TRANSPORTADORA = "ENVIANDO_A_TRANSPORTADORA",
  EN_CAMINO = "EN_CAMINO",
  LLEGANDO_A_DESTINO = "LLEGANDO_A_DESTINO",
  COMPLETADO = "COMPLETADO",
  CANCELADO = "CANCELADO",
}

export interface TrackingHistoryItem {
  at: Date | string;
  status: OrderStatus;
  by?: string;
}

export interface TrackingEventPayload {
  orderId: string;
  trackingStatus: OrderStatus;
  trackingHistory: TrackingHistoryItem[];
}

export interface CustomerConfirmedPayload {
  orderId: string;
  userId: string;
  at: string;
}
```

### 3. Servicio de WebSocket

```typescript
// services/websocketService.ts

import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private url: string;

  constructor(url: string = 'http://localhost:3000') {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.url, {
        transports: ['websocket'],
        // Opcional: agregar autenticación
        // auth: {
        //   token: localStorage.getItem('token'),
        // },
      });

      this.socket.on('connect', () => {
        console.log('🔌 Conectado al WebSocket:', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error);
        reject(error);
      });
    });
  }

  // Suscribirse a actualizaciones de una orden
  subscribeToOrder(orderId: string, callback: (payload: TrackingEventPayload) => void) {
    if (!this.socket) {
      throw new Error('Socket no conectado. Llama a connect() primero.');
    }

    // Unirse a la sala de la orden
    this.socket.emit('order:join', { orderId });

    // Escuchar actualizaciones
    this.socket.on('order:tracking', callback);

    // Confirmar que se unió
    this.socket.on('order:joined', ({ orderId }) => {
      console.log(`✅ Suscrito a orden: ${orderId}`);
    });

    // Retornar función para desuscribirse
    return () => {
      this.socket?.off('order:tracking', callback);
    };
  }

  // Para admins: suscribirse a todas las órdenes
  subscribeAsAdmin(
    onTracking: (payload: TrackingEventPayload) => void,
    onCustomerConfirmed: (payload: CustomerConfirmedPayload) => void
  ) {
    if (!this.socket) {
      throw new Error('Socket no conectado. Llama a connect() primero.');
    }

    this.socket.emit('admin:join');

    this.socket.on('admin:joined', () => {
      console.log('✅ Admin suscrito a sala global');
    });

    this.socket.on('order:tracking', onTracking);
    this.socket.on('order:customer-confirmed', onCustomerConfirmed);

    return () => {
      this.socket?.off('order:tracking', onTracking);
      this.socket?.off('order:customer-confirmed', onCustomerConfirmed);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const websocketService = new WebSocketService(
  process.env.REACT_APP_WS_URL || 'http://localhost:3000'
);
```

### 4. Hook React para Seguimiento de Órdenes

```typescript
// hooks/useOrderTracking.ts

import { useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocketService';
import { TrackingEventPayload, OrderStatus } from '../types/websocket';

interface UseOrderTrackingReturn {
  trackingStatus: OrderStatus | null;
  trackingHistory: TrackingHistoryItem[];
  isConnected: boolean;
  error: string | null;
  subscribe: (orderId: string) => void;
  unsubscribe: () => void;
}

export function useOrderTracking(orderId: string | null): UseOrderTrackingReturn {
  const [trackingStatus, setTrackingStatus] = useState<OrderStatus | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<TrackingHistoryItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Conectar al WebSocket cuando el componente se monta
    websocketService
      .connect()
      .then(() => {
        setIsConnected(true);
        setError(null);
      })
      .catch((err) => {
        setError('Error al conectar con el servidor');
        console.error(err);
      });

    // Desconectar cuando el componente se desmonta
    return () => {
      websocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!orderId || !isConnected) return;

    // Suscribirse a actualizaciones de la orden
    const unsubscribe = websocketService.subscribeToOrder(orderId, (payload) => {
      setTrackingStatus(payload.trackingStatus);
      setTrackingHistory(payload.trackingHistory);
    });

    // Limpiar suscripción cuando cambia la orden o se desmonta
    return unsubscribe;
  }, [orderId, isConnected]);

  return {
    trackingStatus,
    trackingHistory,
    isConnected,
    error,
    subscribe: (id: string) => {
      // Implementación si necesitas suscribirte manualmente
    },
    unsubscribe: () => {
      // Implementación si necesitas desuscribirte manualmente
    },
  };
}
```

### 5. Componente de Seguimiento en Vivo

```typescript
// components/OrderTracking.tsx

import React from 'react';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { OrderStatus } from '../types/websocket';

interface OrderTrackingProps {
  orderId: string;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ orderId }) => {
  const { trackingStatus, trackingHistory, isConnected, error } = useOrderTracking(orderId);

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PREPARANDO_PEDIDO]: 'Preparando pedido',
      [OrderStatus.ENVIANDO_A_TRANSPORTADORA]: 'Enviando a transportadora',
      [OrderStatus.EN_CAMINO]: 'En camino',
      [OrderStatus.LLEGANDO_A_DESTINO]: 'Llegando a destino',
      [OrderStatus.COMPLETADO]: 'Completado',
      [OrderStatus.CANCELADO]: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: OrderStatus): string => {
    const icons: Record<OrderStatus, string> = {
      [OrderStatus.PREPARANDO_PEDIDO]: '📦',
      [OrderStatus.ENVIANDO_A_TRANSPORTADORA]: '🚚',
      [OrderStatus.EN_CAMINO]: '🚛',
      [OrderStatus.LLEGANDO_A_DESTINO]: '📍',
      [OrderStatus.COMPLETADO]: '✅',
      [OrderStatus.CANCELADO]: '❌',
    };
    return icons[status] || '❓';
  };

  if (error) {
    return (
      <div className="error">
        <p>❌ {error}</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="loading">
        <p>Conectando al servidor...</p>
      </div>
    );
  }

  return (
    <div className="order-tracking">
      <div className="tracking-header">
        <h2>Seguimiento de Orden: {orderId}</h2>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
      </div>

      {trackingStatus && (
        <div className="current-status">
          <div className="status-icon">{getStatusIcon(trackingStatus)}</div>
          <div className="status-info">
            <h3>{getStatusLabel(trackingStatus)}</h3>
            <p>Estado actual de tu pedido</p>
          </div>
        </div>
      )}

      <div className="tracking-history">
        <h3>Historial de Seguimiento</h3>
        <ul>
          {trackingHistory.map((item, index) => (
            <li key={index} className="history-item">
              <div className="history-icon">{getStatusIcon(item.status)}</div>
              <div className="history-content">
                <p className="history-status">{getStatusLabel(item.status)}</p>
                <p className="history-date">
                  {new Date(item.at).toLocaleString('es-ES')}
                </p>
                {item.by && <p className="history-by">Por: {item.by}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
```

### 6. Componente para Admin (Vista Global)

```typescript
// components/AdminTrackingDashboard.tsx

import React, { useEffect, useState } from 'react';
import { websocketService } from '../services/websocketService';
import { TrackingEventPayload, CustomerConfirmedPayload } from '../types/websocket';

export const AdminTrackingDashboard: React.FC = () => {
  const [updates, setUpdates] = useState<TrackingEventPayload[]>([]);
  const [confirmations, setConfirmations] = useState<CustomerConfirmedPayload[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    websocketService
      .connect()
      .then(() => {
        setIsConnected(true);
      })
      .catch(console.error);

    const unsubscribe = websocketService.subscribeAsAdmin(
      (trackingPayload) => {
        console.log('📦 Actualización de tracking:', trackingPayload);
        setUpdates((prev) => [trackingPayload, ...prev].slice(0, 50)); // Últimas 50
      },
      (confirmationPayload) => {
        console.log('✅ Cliente confirmó entrega:', confirmationPayload);
        setConfirmations((prev) => [confirmationPayload, ...prev].slice(0, 50));
      }
    );

    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, []);

  return (
    <div className="admin-dashboard">
      <h1>Dashboard de Seguimiento (Admin)</h1>
      <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div>

      <div className="updates-section">
        <h2>Actualizaciones Recientes ({updates.length})</h2>
        {updates.map((update, index) => (
          <div key={index} className="update-card">
            <p><strong>Orden:</strong> {update.orderId}</p>
            <p><strong>Estado:</strong> {update.trackingStatus}</p>
            <p><strong>Historial:</strong> {update.trackingHistory.length} eventos</p>
          </div>
        ))}
      </div>

      <div className="confirmations-section">
        <h2>Confirmaciones de Clientes ({confirmations.length})</h2>
        {confirmations.map((conf, index) => (
          <div key={index} className="confirmation-card">
            <p><strong>Orden:</strong> {conf.orderId}</p>
            <p><strong>Usuario:</strong> {conf.userId}</p>
            <p><strong>Fecha:</strong> {new Date(conf.at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 📊 Estados de Seguimiento

### Estados Disponibles

```typescript
export enum OrderStatus {
  PREPARANDO_PEDIDO = "PREPARANDO_PEDIDO",
  ENVIANDO_A_TRANSPORTADORA = "ENVIANDO_A_TRANSPORTADORA",
  EN_CAMINO = "EN_CAMINO",
  LLEGANDO_A_DESTINO = "LLEGANDO_A_DESTINO",
  COMPLETADO = "COMPLETADO",
  CANCELADO = "CANCELADO",
}
```

### Transiciones Válidas

```typescript
// Un estado solo puede avanzar a ciertos estados:
PREPARANDO_PEDIDO → ENVIANDO_A_TRANSPORTADORA | CANCELADO
ENVIANDO_A_TRANSPORTADORA → EN_CAMINO | CANCELADO
EN_CAMINO → LLEGANDO_A_DESTINO | CANCELADO
LLEGANDO_A_DESTINO → COMPLETADO
COMPLETADO → (final)
CANCELADO → (final)
```

---

## 🎯 Ejemplos Completos

### Ejemplo 1: Página de Seguimiento de Orden

```typescript
// pages/OrderTrackingPage.tsx

import React from 'react';
import { useParams } from 'react-router-dom';
import { OrderTracking } from '../components/OrderTracking';

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  if (!orderId) {
    return <div>Orden no encontrada</div>;
  }

  return (
    <div className="page">
      <OrderTracking orderId={orderId} />
    </div>
  );
};
```

### Ejemplo 2: Integración con React Router

```typescript
// App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { OrderTrackingPage } from './pages/OrderTrackingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/orders/:orderId/tracking" element={<OrderTrackingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Ejemplo 3: Manejo de Reconexión

```typescript
// services/websocketService.ts (mejora)

class WebSocketService {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.url, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log('🔌 Conectado al WebSocket');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reintentando conexión (${attemptNumber}/${this.maxReconnectAttempts})`);
        this.reconnectAttempts = attemptNumber;
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ No se pudo reconectar');
        reject(new Error('No se pudo reconectar al servidor'));
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });
    });
  }
}
```

---

## 🔐 Autenticación (Opcional)

Si necesitas autenticación en WebSocket:

```typescript
// Backend
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    // Verificar token JWT
    jwt.verify(token, SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.data.user = decoded;
      next();
    });
  } else {
    next(new Error('Authentication error'));
  }
});

// Frontend
const socket = io(URL, {
  auth: {
    token: localStorage.getItem('token'),
  },
});
```

---

## 📝 Resumen

1. **Backend**: Usa Socket.IO para emitir eventos a salas específicas (`order:ORD-123`)
2. **Frontend**: Conecta con `socket.io-client`, se suscribe a la sala de la orden
3. **Eventos**: Escucha `order:tracking` para recibir actualizaciones en tiempo real
4. **Estados**: Sigue el flujo de estados definido en `OrderStatus`
5. **Reconexión**: Maneja automáticamente desconexiones y reconexiones

¡Listo para implementar seguimiento en vivo! 🚀

