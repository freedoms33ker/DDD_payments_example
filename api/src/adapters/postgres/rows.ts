import type { Payment, PaymentStatus } from '../../domain/payment';
import type { Refund, RefundStatus } from '../../domain/refund';

export function cents(value: string | number): number {
  return Number(value);
}

type PaymentRow = {
  payment_id: string;
  merchant_id: string;
  amount_minor: string;
  status: PaymentStatus;
  captured_total_minor: string;
  created_at: Date;
  authorized_at: Date | null;
  expires_at: Date | null;
  captured_at: Date | null;
  voided_at: Date | null;
  idempotency_key: string;
};

type RefundRow = {
  refund_id: string;
  payment_id: string;
  amount_minor: string;
  status: RefundStatus;
  reason: string;
  completed_at: Date | null;
};

export function paymentFromRow(row: PaymentRow | undefined): Payment | null {
  if (!row) {
    return null;
  }

  return {
    paymentId: row.payment_id,
    merchantId: row.merchant_id,
    amountMinor: cents(row.amount_minor),
    status: row.status,
    capturedTotalMinor: cents(row.captured_total_minor),
    createdAt: row.created_at,
    authorizedAt: row.authorized_at,
    expiresAt: row.expires_at,
    capturedAt: row.captured_at,
    voidedAt: row.voided_at,
    idempotencyKey: row.idempotency_key,
  };
}

export function refundFromRow(row: RefundRow | undefined): Refund | null {
  if (!row) {
    return null;
  }

  return {
    refundId: row.refund_id,
    paymentId: row.payment_id,
    amountMinor: cents(row.amount_minor),
    status: row.status,
    reason: row.reason,
    completedAt: row.completed_at,
  };
}

export type { PaymentRow, RefundRow };
