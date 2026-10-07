import express, { type NextFunction, type Request, type Response } from 'express';
import { Pool } from 'pg';

import { fakeAcquirer } from './adapters/acquirer/fake-acquirer';
import { registerPaymentRoutes } from './adapters/http/routes';
import { createBalanceFold } from './adapters/postgres/balance-fold';
import { createPaymentRepository } from './adapters/postgres/payment-repository';
import { createRefundRepository } from './adapters/postgres/refund-repository';
import { handleAuthorizePayment } from './application/authorize-payment';
import { handleCapturePayment } from './application/capture-payment';
import { handleCompleteRefund } from './application/complete-refund';
import { handleFailRefund } from './application/fail-refund';
import { handleGetBalance } from './application/get-balance';
import { handleGetPayment, handleListRefunds } from './application/get-payment';
import { handleInitiatePayment } from './application/initiate-payment';
import { handleRequestRefund } from './application/request-refund';
import { handleVoidPayment } from './application/void-payment';
import { systemClock } from './ports/clock';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'pmts',
  password: process.env.PGPASSWORD || 'pmts',
  database: process.env.PGDATABASE || 'pmts',
  connectionTimeoutMillis: 5000,
});

const clock = systemClock();
const acquirer = fakeAcquirer();
const payments = createPaymentRepository(pool);
const refunds = createRefundRepository(pool);
const balances = createBalanceFold(pool);
const authorizationWindowDays = Number(process.env.AUTHORIZATION_WINDOW_DAYS || 7);

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json());

// Liveness: the process is up.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Readiness: the database is reachable and answering queries.
app.get('/health/db', async (_req, res) => {
  const started = Date.now();
  try {
    const { rows } = await pool.query<{ version: string; database: string; server_time: Date }>(
      'SELECT version() AS version, current_database() AS database, now() AS server_time',
    );
    const row = rows[0];
    if (!row) {
      throw new Error('database returned no row');
    }
    res.json({ status: 'ok', latencyMs: Date.now() - started, ...row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'database unavailable';
    res.status(503).json({ status: 'error', error: message });
  }
});

registerPaymentRoutes(app, {
  initiatePayment: (input) => handleInitiatePayment({ ...input, payments, clock }),
  authorizePayment: (input) => handleAuthorizePayment({
    ...input,
    payments,
    acquirer,
    clock,
    authorizationWindowDays,
  }),
  capturePayment: (input) => handleCapturePayment({ ...input, payments, clock }),
  voidPayment: (input) => handleVoidPayment({ ...input, payments, clock }),
  getPayment: (input) => handleGetPayment({ ...input, payments }),
  listRefunds: (input) => handleListRefunds({ ...input, payments, refunds }),
  requestRefund: (input) => handleRequestRefund({ ...input, payments, refunds }),
  completeRefund: (input) => handleCompleteRefund({ ...input, refunds, clock }),
  failRefund: (input) => handleFailRefund({ ...input, refunds, clock }),
  getBalance: (input) => handleGetBalance({ ...input, balances }),
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '22P02') {
    res.status(404).json({ rejected: true, reason: 'NotFound' });
    return;
  }
  console.error(error);
  res.status(500).json({ status: 'error', error: 'Internal server error' });
});

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`pmts-api listening on :${port}`);
});

function shutdown(): void {
  server.close(() => {
    pool.end().then(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
