import { authorizationWindowHasPassed, expire, voidPayment } from '../domain/payment';
import { isRejected, reject } from '../domain/rejection';
import type { Clock } from '../ports/clock';
import type { PaymentRepository } from '../ports/repositories';

export async function handleVoidPayment(input: {
  paymentId: string;
  payments: PaymentRepository;
  clock: Clock;
}) {
  const payment = await input.payments.findById(input.paymentId);
  if (!payment) {
    return reject('PaymentNotFound');
  }

  const now = input.clock.now();
  if (authorizationWindowHasPassed(payment, now)) {
    const expired = expire(payment);
    if (isRejected(expired)) {
      return expired;
    }
    await input.payments.update(expired);
    return { payment: expired };
  }

  const voided = voidPayment(payment, { voidedAt: now });
  if (isRejected(voided)) {
    return voided;
  }

  await input.payments.update(voided);
  return { payment: voided };
}
