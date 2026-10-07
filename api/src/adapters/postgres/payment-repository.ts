import type { Pool } from 'pg';
import type { PaymentRepository } from '../../ports/repositories';
import { paymentFromRow, type PaymentRow } from './rows';

const PAYMENT_COLUMNS = `
  payment_id, merchant_id, amount_minor, status, captured_total_minor,
  created_at, authorized_at, expires_at, captured_at, voided_at, idempotency_key
`;

export function createPaymentRepository(pool: Pool): PaymentRepository {
  return {
    async findById(paymentId) {
      const result = await pool.query<PaymentRow>(
        `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE payment_id = $1`,
        [paymentId],
      );
      return paymentFromRow(result.rows[0]);
    },

    async findByMerchantAndKey(merchantId, idempotencyKey) {
      const result = await pool.query<PaymentRow>(
        `SELECT ${PAYMENT_COLUMNS}
         FROM payments
         WHERE merchant_id = $1 AND idempotency_key = $2`,
        [merchantId, idempotencyKey],
      );
      return paymentFromRow(result.rows[0]);
    },

    async insert(payment) {
      await pool.query(
        `INSERT INTO payments (
           payment_id, merchant_id, amount_minor, status, captured_total_minor,
           created_at, authorized_at, expires_at, captured_at, voided_at, idempotency_key
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          payment.paymentId,
          payment.merchantId,
          payment.amountMinor,
          payment.status,
          payment.capturedTotalMinor,
          payment.createdAt,
          payment.authorizedAt,
          payment.expiresAt,
          payment.capturedAt,
          payment.voidedAt,
          payment.idempotencyKey,
        ],
      );
    },

    async update(payment) {
      await pool.query(
        `UPDATE payments
         SET status = $2,
             captured_total_minor = $3,
             authorized_at = $4,
             expires_at = $5,
             captured_at = $6,
             voided_at = $7
         WHERE payment_id = $1`,
        [
          payment.paymentId,
          payment.status,
          payment.capturedTotalMinor,
          payment.authorizedAt,
          payment.expiresAt,
          payment.capturedAt,
          payment.voidedAt,
        ],
      );
    },
  };
}
