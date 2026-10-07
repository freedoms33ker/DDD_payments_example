import { authorizationWindowHasPassed, capture, expire } from '../domain/payment';
import { isRejected, reject } from '../domain/rejection';
import type { Clock } from '../ports/clock';
import type { PaymentRepository } from '../ports/repositories';

export async function handleCapturePayment(input: {
  paymentId: string;
  amountMinor: unknown;
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

  const captured = capture(payment, {
    amountMinor: input.amountMinor === undefined ? payment.amountMinor : input.amountMinor,
    capturedAt: now,
  });
  if (isRejected(captured)) {
    return captured;
  }

  await input.payments.update(captured);
  return { payment: captured };
}
