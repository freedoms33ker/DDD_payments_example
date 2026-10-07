import { randomUUID } from 'crypto';
import { initiatePayment } from '../domain/payment';
import { isRejected } from '../domain/rejection';
import type { Clock } from '../ports/clock';
import type { PaymentRepository } from '../ports/repositories';

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export async function handleInitiatePayment(input: {
  merchantId: unknown;
  amountMinor: unknown;
  idempotencyKey: unknown;
  payments: PaymentRepository;
  clock: Clock;
}) {
  if (typeof input.merchantId === 'string' && typeof input.idempotencyKey === 'string') {
    const existing = await input.payments.findByMerchantAndKey(input.merchantId, input.idempotencyKey);
    if (existing) {
      return { created: false as const, payment: existing };
    }
  }

  const payment = initiatePayment({
    paymentId: randomUUID(),
    merchantId: input.merchantId,
    amountMinor: input.amountMinor,
    idempotencyKey: input.idempotencyKey,
    createdAt: input.clock.now(),
  });
  if (isRejected(payment)) {
    return payment;
  }

  try {
    await input.payments.insert(payment);
  } catch (error) {
    if (isUniqueViolation(error) && typeof input.merchantId === 'string' && typeof input.idempotencyKey === 'string') {
      const raced = await input.payments.findByMerchantAndKey(input.merchantId, input.idempotencyKey);
      if (raced) {
        return { created: false as const, payment: raced };
      }
    }
    throw error;
  }

  return { created: true as const, payment };
}
