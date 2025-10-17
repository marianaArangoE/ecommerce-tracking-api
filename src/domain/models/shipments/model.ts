export interface Shipment {
  id: string;
  orderId: string;
  carrier: string;             // Transportadora: Servientrega, DHL, etc.
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export type ShipmentStatus =
  | 'pending'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'returned';
