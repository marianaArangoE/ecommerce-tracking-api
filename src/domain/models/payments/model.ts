export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'transfer' | 'cash_on_delivery';
  provider?: string;           // Visa, MasterCard, etc.
  last4?: string;              // Últimos 4 dígitos
  tokenized?: boolean;         // Si se guarda el método
  createdAt: string;
}
