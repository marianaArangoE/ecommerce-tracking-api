export enum OrderStatus {
  PREPARANDO_PEDIDO = "PREPARANDO_PEDIDO",
  ENVIANDO_A_TRANSPORTADORA = "ENVIANDO_A_TRANSPORTADORA",
  EN_CAMINO = "EN_CAMINO",
  LLEGANDO_A_DESTINO = "LLEGANDO_A_DESTINO",
  COMPLETADO = "COMPLETADO",
  CANCELADO = "CANCELADO",
}

export const AllowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PREPARANDO_PEDIDO]: [OrderStatus.ENVIANDO_A_TRANSPORTADORA, OrderStatus.CANCELADO],
  [OrderStatus.ENVIANDO_A_TRANSPORTADORA]: [OrderStatus.EN_CAMINO, OrderStatus.CANCELADO],
  [OrderStatus.EN_CAMINO]: [OrderStatus.LLEGANDO_A_DESTINO, OrderStatus.CANCELADO],
  [OrderStatus.LLEGANDO_A_DESTINO]: [OrderStatus.COMPLETADO],
  [OrderStatus.COMPLETADO]: [],
  [OrderStatus.CANCELADO]: [],
};
