import { reject } from '../domain/rejection';
import type { PaymentRepository, RefundRepository } from '../ports/repositories';

export async function handleGetPayment(input: { paymentId: string; payments: PaymentRepository }) {
  const payment = await input.payments.findById(input.paymentId);
  if (!payment) {
    return reject('PaymentNotFound');
  }
  return { payment };
}

export async function handleListRefunds(input: {
  paymentId: string;
  payments: PaymentRepository;
  refunds: RefundRepository;
}) {
  const payment = await input.payments.findById(input.paymentId);
  if (!payment) {
    return reject('PaymentNotFound');
  }
  const rows = await input.refunds.listByPaymentId(input.paymentId);
  return { refunds: rows };
}
