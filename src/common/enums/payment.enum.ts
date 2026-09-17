export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
}

export enum ProviderMethod {
  STRIPE = 'stripe',
  MERCADO_PAGO = 'mercado_pago',
  PAYPAL = 'paypal',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
  FAILED = 'failed',
}
