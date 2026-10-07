import type { Response } from 'express';
import type { MerchantBalance } from '../../domain/balance';
import type { Payment } from '../../domain/payment';
import type { Refund } from '../../domain/refund';
import type { Rejection } from '../../domain/rejection';

export type HandlerResult =
  | Rejection
  | { created?: boolean; payment: Payment; authCode?: string; declineReason?: string }
  | { created?: boolean; refund: Refund }
  | { refunds: Refund[] }
  | { balance: MerchantBalance };

function timestamp(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString();
}

function paymentBody(payment: Payment, extras: { authCode?: string; declineReason?: string } = {}) {
  return {
    paymentId: payment.paymentId,
    merchantId: payment.merchantId,
    amountMinor: payment.amountMinor,
    status: payment.status,
    capturedTotalMinor: payment.capturedTotalMinor,
    createdAt: timestamp(payment.createdAt),
    authorizedAt: timestamp(payment.authorizedAt),
    expiresAt: timestamp(payment.expiresAt),
    capturedAt: timestamp(payment.capturedAt),
    voidedAt: timestamp(payment.voidedAt),
    idempotencyKey: payment.idempotencyKey,
    ...extras,
  };
}

function refundBody(refund: Refund) {
  return {
    refundId: refund.refundId,
    paymentId: refund.paymentId,
    amountMinor: refund.amountMinor,
    status: refund.status,
    reason: refund.reason,
    completedAt: timestamp(refund.completedAt),
  };
}

export function sendResult(res: Response, result: HandlerResult, createdStatus = 201): void {
  if ('rejected' in result) {
    const status = result.reason === 'PaymentNotFound' || result.reason === 'RefundNotFound' ? 404 : 422;
    res.status(status).json({ rejected: true, reason: result.reason });
    return;
  }

  if ('payment' in result) {
    const extras: { authCode?: string; declineReason?: string } = {};
    if ('authCode' in result && result.authCode) {
      extras.authCode = result.authCode;
    }
    if ('declineReason' in result && result.declineReason) {
      extras.declineReason = result.declineReason;
    }
    const status = result.created ? createdStatus : 200;
    res.status(status).json(paymentBody(result.payment, extras));
    return;
  }

  if ('refund' in result) {
    res.status(result.created ? createdStatus : 200).json(refundBody(result.refund));
    return;
  }

  if ('refunds' in result) {
    res.status(200).json(result.refunds.map(refundBody));
    return;
  }

  res.status(200).json(result.balance);
}
