import { reject, type Rejection } from './rejection';

export const PAYMENT_STATUSES = ['Pending', 'Authorized', 'Captured', 'Voided', 'Expired', 'Failed'] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type Payment = {
  paymentId: string;
  merchantId: string;
  amountMinor: number;
  status: PaymentStatus;
  capturedTotalMinor: number;
  createdAt: Date;
  authorizedAt: Date | null;
  expiresAt: Date | null;
  capturedAt: Date | null;
  voidedAt: Date | null;
  idempotencyKey: string;
};

function isPositiveCents(amountMinor: unknown): amountMinor is number {
  return Number.isInteger(amountMinor) && (amountMinor as number) > 0;
}

export function initiatePayment(input: {
  paymentId: string;
  merchantId: unknown;
  amountMinor: unknown;
  idempotencyKey: unknown;
  createdAt: Date;
}): Payment | Rejection {
  if (typeof input.merchantId !== 'string' || input.merchantId === '' ||
      typeof input.idempotencyKey !== 'string' || input.idempotencyKey === '') {
    return reject('MerchantIdAndIdempotencyKeyRequired');
  }
  if (!isPositiveCents(input.amountMinor)) {
    return reject('AmountMustBePositive');
  }

  return {
    paymentId: input.paymentId,
    merchantId: input.merchantId,
    amountMinor: input.amountMinor,
    status: 'Pending',
    capturedTotalMinor: 0,
    createdAt: input.createdAt,
    authorizedAt: null,
    expiresAt: null,
    capturedAt: null,
    voidedAt: null,
    idempotencyKey: input.idempotencyKey,
  };
}

export function markAuthorized(
  payment: Payment,
  input: { authorizedAt: Date; expiresAt: Date },
): Payment | Rejection {
  if (payment.status !== 'Pending') {
    return reject('PaymentNotPending');
  }

  return {
    ...payment,
    status: 'Authorized',
    authorizedAt: input.authorizedAt,
    expiresAt: input.expiresAt,
  };
}

export function markFailed(payment: Payment): Payment | Rejection {
  if (payment.status !== 'Pending') {
    return reject('PaymentNotPending');
  }

  return {
    ...payment,
    status: 'Failed',
  };
}

export function capture(
  payment: Payment,
  input: { amountMinor: unknown; capturedAt: Date },
): Payment | Rejection {
  if (payment.status !== 'Authorized') {
    return reject('PaymentNotAuthorized');
  }
  if (!isPositiveCents(input.amountMinor) || input.amountMinor > payment.amountMinor) {
    return reject('CaptureAmountOutOfRange');
  }

  return {
    ...payment,
    status: 'Captured',
    capturedTotalMinor: input.amountMinor,
    capturedAt: input.capturedAt,
  };
}

export function voidPayment(payment: Payment, input: { voidedAt: Date }): Payment | Rejection {
  if (payment.status !== 'Authorized') {
    return reject('PaymentNotAuthorized');
  }

  return {
    ...payment,
    status: 'Voided',
    voidedAt: input.voidedAt,
  };
}

export function expire(payment: Payment): Payment | Rejection {
  if (payment.status !== 'Authorized') {
    return reject('PaymentNotAuthorized');
  }

  return {
    ...payment,
    status: 'Expired',
  };
}

export function authorizationWindowHasPassed(payment: Payment, now: Date): boolean {
  if (payment.status !== 'Authorized' || !payment.expiresAt) {
    return false;
  }
  return now.getTime() >= payment.expiresAt.getTime();
}
