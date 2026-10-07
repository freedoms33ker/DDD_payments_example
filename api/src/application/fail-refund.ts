import { failRefund } from '../domain/refund';
import { isRejected, reject } from '../domain/rejection';
import type { Clock } from '../ports/clock';
import type { RefundRepository } from '../ports/repositories';

export async function handleFailRefund(input: {
  refundId: string;
  refunds: RefundRepository;
  clock: Clock;
}) {
  const refund = await input.refunds.findById(input.refundId);
  if (!refund) {
    return reject('RefundNotFound');
  }

  const failed = failRefund(refund, { completedAt: input.clock.now() });
  if (isRejected(failed)) {
    return failed;
  }

  await input.refunds.update(failed);
  return { refund: failed };
}
