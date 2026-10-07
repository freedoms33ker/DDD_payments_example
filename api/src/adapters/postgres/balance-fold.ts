import type { Pool } from 'pg';
import type { BalanceReader } from '../../ports/repositories';
import { cents } from './rows';

type PaymentTotals = {
  captured_total: string;
  authorized_not_captured: string;
};

type RefundTotals = {
  refunded_total: string;
  pending_refunds: string;
};

export function createBalanceFold(pool: Pool): BalanceReader {
  return {
    async foldForMerchant(merchantId) {
      const payments = await pool.query<PaymentTotals>(
        `SELECT
           COALESCE(SUM(captured_total_minor) FILTER (WHERE status = 'Captured'), 0) AS captured_total,
           COALESCE(SUM(amount_minor) FILTER (WHERE status = 'Authorized'), 0) AS authorized_not_captured
         FROM payments
         WHERE merchant_id = $1`,
        [merchantId],
      );
      const refunds = await pool.query<RefundTotals>(
        `SELECT
           COALESCE(SUM(refunds.amount_minor) FILTER (WHERE refunds.status = 'Succeeded'), 0) AS refunded_total,
           COALESCE(SUM(refunds.amount_minor) FILTER (WHERE refunds.status = 'Pending'), 0) AS pending_refunds
         FROM refunds
         JOIN payments ON payments.payment_id = refunds.payment_id
         WHERE payments.merchant_id = $1`,
        [merchantId],
      );

      const capturedTotal = cents(payments.rows[0]?.captured_total ?? 0);
      const refundedTotal = cents(refunds.rows[0]?.refunded_total ?? 0);

      return {
        capturedTotal,
        refundedTotal,
        netBalance: capturedTotal - refundedTotal,
        pendingRefunds: cents(refunds.rows[0]?.pending_refunds ?? 0),
        authorizedNotCaptured: cents(payments.rows[0]?.authorized_not_captured ?? 0),
      };
    },
  };
}
