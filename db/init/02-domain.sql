-- Current state of the Payment and Refund aggregates.
-- Amounts are USD cents. There is no currency column, event log, or balance table.

CREATE TABLE payments (
  payment_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id           text NOT NULL,
  amount_minor          bigint NOT NULL CHECK (amount_minor > 0),
  status                text NOT NULL CHECK (
                          status IN ('Pending', 'Authorized', 'Captured', 'Voided', 'Expired', 'Failed')
                        ),
  captured_total_minor  bigint NOT NULL DEFAULT 0 CHECK (captured_total_minor >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  authorized_at         timestamptz,
  expires_at            timestamptz,
  captured_at           timestamptz,
  voided_at             timestamptz,
  idempotency_key       text NOT NULL,
  CONSTRAINT captured_total_within_amount CHECK (captured_total_minor <= amount_minor),
  CONSTRAINT payments_merchant_idempotency UNIQUE (merchant_id, idempotency_key)
);

CREATE INDEX payments_merchant_id_idx ON payments (merchant_id);

CREATE TABLE refunds (
  refund_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    uuid NOT NULL REFERENCES payments (payment_id),
  amount_minor  bigint NOT NULL CHECK (amount_minor > 0),
  status        text NOT NULL CHECK (status IN ('Pending', 'Succeeded', 'Failed')),
  reason        text NOT NULL,
  completed_at  timestamptz
);

CREATE INDEX refunds_payment_id_idx ON refunds (payment_id);
