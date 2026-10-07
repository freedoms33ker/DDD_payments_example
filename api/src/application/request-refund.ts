import { randomUUID } from 'crypto';
import { requestRefund } from '../domain/refund';
import { isRejected, reject } from '../domain/rejection';
import type { PaymentRepository, RefundRepository } from '../ports/repositories';

export async function handleRequestRefund(input: {
  paymentId: string;
  amountMinor: unknown;
  reason: unknown;
  payments: PaymentRepository;
  refunds: RefundRepository;
}) {
  const payment = await input.payments.findById(input.paymentId);
  if (!payment) {
    return reject('PaymentNotFound');
  }

  const refund = requestRefund({
    refundId: randomUUID(),
    paymentId: input.paymentId,
    amountMinor: input.amountMinor,
    reason: input.reason,
  });
  if (isRejected(refund)) {
    return refund;
  }
  if (payment.status !== 'Captured') {
    return reject('PaymentNotCaptured');
  }

  const alreadyRefunded = await input.refunds.sumPendingAndSucceeded(input.paymentId);
  if (alreadyRefunded + refund.amountMinor > payment.capturedTotalMinor) {
    return reject('RefundExceedsCapturedTotal');
  }

  await input.refunds.insert(refund);
  return { created: true as const, refund };
}
