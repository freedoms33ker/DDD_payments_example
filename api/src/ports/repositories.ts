import type { MerchantBalance } from '../domain/balance';
import type { Payment } from '../domain/payment';
import type { Refund } from '../domain/refund';

export type PaymentRepository = {
  findById(paymentId: string): Promise<Payment | null>;
  findByMerchantAndKey(merchantId: string, idempotencyKey: string): Promise<Payment | null>;
  insert(payment: Payment): Promise<void>;
  update(payment: Payment): Promise<void>;
};

export type RefundRepository = {
  findById(refundId: string): Promise<Refund | null>;
  listByPaymentId(paymentId: string): Promise<Refund[]>;
  sumPendingAndSucceeded(paymentId: string): Promise<number>;
  insert(refund: Refund): Promise<void>;
  update(refund: Refund): Promise<void>;
};

export type BalanceReader = {
  foldForMerchant(merchantId: string): Promise<MerchantBalance>;
};
