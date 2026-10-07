import type { Pool } from 'pg';
import type { RefundRepository } from '../../ports/repositories';
import { cents, refundFromRow, type RefundRow } from './rows';

const REFUND_COLUMNS = `
  refund_id, payment_id, amount_minor, status, reason, completed_at
`;

type SumRow = { total: string };

export function createRefundRepository(pool: Pool): RefundRepository {
  return {
    async findById(refundId) {
      const result = await pool.query<RefundRow>(
        `SELECT ${REFUND_COLUMNS} FROM refunds WHERE refund_id = $1`,
        [refundId],
      );
      return refundFromRow(result.rows[0]);
    },

    async listByPaymentId(paymentId) {
      const result = await pool.query<RefundRow>(
        `SELECT ${REFUND_COLUMNS}
         FROM refunds
         WHERE payment_id = $1
         ORDER BY refund_id`,
        [paymentId],
      );
      return result.rows.map((row) => refundFromRow(row)).filter((row): row is NonNullable<typeof row> => row !== null);
    },

    async sumPendingAndSucceeded(paymentId) {
      const result = await pool.query<SumRow>(
        `SELECT COALESCE(SUM(amount_minor), 0) AS total
         FROM refunds
         WHERE payment_id = $1 AND status IN ('Pending', 'Succeeded')`,
        [paymentId],
      );
      const total = result.rows[0]?.total ?? 0;
      return cents(total);
    },

    async insert(refund) {
      await pool.query(
        `INSERT INTO refunds (
           refund_id, payment_id, amount_minor, status, reason, completed_at
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          refund.refundId,
          refund.paymentId,
          refund.amountMinor,
          refund.status,
          refund.reason,
          refund.completedAt,
        ],
      );
    },

    async update(refund) {
      await pool.query(
        `UPDATE refunds
         SET status = $2, completed_at = $3
         WHERE refund_id = $1`,
        [refund.refundId, refund.status, refund.completedAt],
      );
    },
  };
}
