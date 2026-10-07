import { markAuthorized, markFailed } from '../domain/payment';
import { isRejected, reject } from '../domain/rejection';
import type { Acquirer } from '../ports/acquirer';
import { authorizationExpiresAt, type Clock } from '../ports/clock';
import type { PaymentRepository } from '../ports/repositories';

export async function handleAuthorizePayment(input: {
  paymentId: string;
  token: unknown;
  payments: PaymentRepository;
  acquirer: Acquirer;
  clock: Clock;
  authorizationWindowDays: number;
}) {
  if (typeof input.token !== 'string' || input.token === '') {
    return reject('TokenRequired');
  }

  const payment = await input.payments.findById(input.paymentId);
  if (!payment) {
    return reject('PaymentNotFound');
  }
  if (payment.status !== 'Pending') {
    return reject('PaymentNotPending');
  }

  const decision = input.acquirer.authorize(input.token, payment.amountMinor);
  const authorizedAt = input.clock.now();

  const updated = decision.approved
    ? markAuthorized(payment, {
        authorizedAt,
        expiresAt: authorizationExpiresAt(authorizedAt, input.authorizationWindowDays),
      })
    : markFailed(payment);

  if (isRejected(updated)) {
    return updated;
  }

  await input.payments.update(updated);

  if (decision.approved) {
    return { payment: updated, authCode: decision.authCode };
  }
  return { payment: updated, declineReason: decision.declineReason };
}
