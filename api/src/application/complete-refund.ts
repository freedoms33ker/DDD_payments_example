import { completeRefund } from '../domain/refund';
import { isRejected, reject } from '../domain/rejection';
import type { Clock } from '../ports/clock';
import type { RefundRepository } from '../ports/repositories';

export async function handleCompleteRefund(input: {
  refundId: string;
  refunds: RefundRepository;
  clock: Clock;
}) {
  const refund = await input.refunds.findById(input.refundId);
  if (!refund) {
    return reject('RefundNotFound');
  }

  const completed = completeRefund(refund, { completedAt: input.clock.now() });
  if (isRejected(completed)) {
    return completed;
  }

  await input.refunds.update(completed);
  return { refund: completed };
}
