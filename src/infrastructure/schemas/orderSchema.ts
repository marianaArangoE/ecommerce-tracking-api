import { Schema } from "mongoose";
import { OrderStatus } from "../../domain/models/orders/orderStatus"; 

export const OrderItemSchema = new Schema({
  productId:      { type: String, required: true },
  name:           { type: String, required: true },
  sku:            { type: String, required: true },
  quantity:       { type: Number, required: true, min: 1, max: 999 },
  unitPriceCents: { type: Number, required: true, min: 0 },
  totalCents:     { type: Number, required: true, min: 0 },
}, { _id: false });


const TrackingHistorySchema = new Schema({
  at:     { type: Date, required: true },
  status: { type: String, enum: Object.values(OrderStatus), required: true },
  by:     { type: String },
}, { _id: false });

export const OrderSchema = new Schema({
  userId:     { type: String, required: true, index: true },
  orderId:    { type: String, required: true, unique: true }, 
  checkoutId: { type: String, required: true, unique: true },   

  items:      { type: [OrderItemSchema], required: true },
  currency:   { type: String, required: true },
  totalCents: { type: Number, required: true, min: 0 },


  status: {
    type: String,
    enum: ["PENDIENTE","PROCESANDO","COMPLETADA","CANCELADA"],
    default: "PENDIENTE",
  },


  paymentStatus: {
    type: String,
    enum: ["pending","paid","failed","refunded"],
    default: "pending",
  },


  trackingStatus: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PREPARANDO_PEDIDO,
    index: true,
  },
  trackingHistory: {
    type: [TrackingHistorySchema],
    default: [],
  },


  customerConfirmedAt:      { type: String },                 
  customerConfirmedBy:      { type: String },                  
  customerConfirmationSource: {
    type: String,
    enum: ["web","mobile","api"],
  },

  createdAt:  { type: String, default: () => new Date().toISOString(), required: true },
  updatedAt:  { type: String, default: () => new Date().toISOString(), required: true },
}, { versionKey: false });
