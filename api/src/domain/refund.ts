import { reject, type Rejection } from './rejection';

export const REFUND_STATUSES = ['Pending', 'Succeeded', 'Failed'] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

export type Refund = {
  refundId: string;
  paymentId: string;
  amountMinor: number;
  status: RefundStatus;
  reason: string;
  completedAt: Date | null;
};

export function requestRefund(input: {
  refundId: string;
  paymentId: string;
  amountMinor: unknown;
  reason: unknown;
}): Refund | Rejection {
  if (!Number.isInteger(input.amountMinor) || (input.amountMinor as number) <= 0) {
    return reject('AmountMustBePositive');
  }

  return {
    refundId: input.refundId,
    paymentId: input.paymentId,
    amountMinor: input.amountMinor as number,
    status: 'Pending',
    reason: input.reason == null ? '' : String(input.reason),
    completedAt: null,
  };
}

export function completeRefund(refund: Refund, input: { completedAt: Date }): Refund | Rejection {
  if (refund.status !== 'Pending') {
    return reject('RefundNotPending');
  }

  return {
    ...refund,
    status: 'Succeeded',
    completedAt: input.completedAt,
  };
}

export function failRefund(refund: Refund, input: { completedAt: Date }): Refund | Rejection {
  if (refund.status !== 'Pending') {
    return reject('RefundNotPending');
  }

  return {
    ...refund,
    status: 'Failed',
    completedAt: input.completedAt,
  };
}
