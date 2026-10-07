import { useState } from 'react';
import { callApi, readString, type ApiResult } from './api';

type LogEntry = {
  label: string;
  result: ApiResult;
};

const TOKENS = ['tok_ok', 'tok_insufficient', 'tok_declined', 'tok_bad'];

function newKey(): string {
  return crypto.randomUUID();
}

function ResponseBox({ result }: { result: ApiResult | null }) {
  if (!result) {
    return <pre className="response">No response yet.</pre>;
  }
  return (
    <pre className="response">
      {`HTTP ${result.status}\n\n${JSON.stringify(result.body, null, 2)}`}
    </pre>
  );
}

export function App() {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [merchantId, setMerchantId] = useState('acme');
  const [amountMinor, setAmountMinor] = useState('1000');
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  const [token, setToken] = useState('tok_ok');
  const [captureAmount, setCaptureAmount] = useState('400');
  const [refundAmount, setRefundAmount] = useState('250');
  const [refundReason, setRefundReason] = useState('customer changed their mind');
  const [payment, setPayment] = useState<unknown>(null);
  const [refunds, setRefunds] = useState<unknown[]>([]);
  const [balance, setBalance] = useState<unknown>(null);
  const [log, setLog] = useState<LogEntry | null>(null);
  const [apiHealth, setApiHealth] = useState<ApiResult | null>(null);
  const [dbHealth, setDbHealth] = useState<ApiResult | null>(null);
  const [partialCapture, setPartialCapture] = useState<ApiResult | null>(null);
  const [busy, setBusy] = useState(false);

  const paymentId = readString(payment, 'paymentId');

  async function run(label: string, path: string, body?: unknown, apply?: (result: ApiResult) => void) {
    setBusy(true);
    try {
      const result = await callApi(baseUrl, path, body);
      setLog({ label, result });
      apply?.(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request failed';
      const result = { status: 0, body: { error: message } };
      setLog({ label, result });
      apply?.(result);
    } finally {
      setBusy(false);
    }
  }

  function rememberPayment(result: ApiResult) {
    if (result.status < 300 && result.body && typeof result.body === 'object' && 'paymentId' in result.body) {
      setPayment(result.body);
    }
  }

  function rememberRefunds(result: ApiResult) {
    if (result.status < 300 && Array.isArray(result.body)) {
      setRefunds(result.body);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>PMTS</h1>
        <p>Create a payment, authorize it, capture or void it, then refund what was captured.</p>
      </header>

      <section>
        <h2>Connection</h2>
        <label>
          API address
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <div className="row two">
          <div className="check">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run('Health', '/health', undefined, (result) => setApiHealth(result))}
            >
              Check API
            </button>
            <ResponseBox result={apiHealth} />
          </div>
          <div className="check">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run('Database health', '/health/db', undefined, (result) => setDbHealth(result))}
            >
              Check database
            </button>
            <ResponseBox result={dbHealth} />
          </div>
        </div>
      </section>

      <section>
        <h2>Start a payment</h2>
        <div className="row two">
          <label>
            Merchant
            <input value={merchantId} onChange={(event) => setMerchantId(event.target.value)} />
          </label>
          <label>
            Amount in cents
            <input inputMode="numeric" value={amountMinor} onChange={(event) => setAmountMinor(event.target.value)} />
          </label>
        </div>
        <label>
          Idempotency key
          <input value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} />
        </label>
        <p className="hint">Sending the same merchant and key again returns the original payment.</p>
        <div className="actions two">
          <button
            disabled={busy}
            onClick={() => void run('Create payment', '/payments', {
              merchantId,
              amountMinor: Number(amountMinor),
              idempotencyKey,
            }, rememberPayment)}
          >
            Create payment
          </button>
          <button className="secondary" disabled={busy} onClick={() => setIdempotencyKey(newKey())}>
            New key
          </button>
        </div>
      </section>

      <section>
        <h2>Payment</h2>
        {paymentId ? <pre>{JSON.stringify(payment, null, 2)}</pre> : <p className="hint">No payment loaded yet.</p>}
        <label>
          Instrument token
          <select value={token} onChange={(event) => setToken(event.target.value)}>
            {TOKENS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <p className="hint">tok_ok approves. The other tokens decline. The token and auth code are not stored.</p>
        <div className="actions two">
          <button
            disabled={busy || !paymentId}
            onClick={() => void run('Authorize', `/payments/${paymentId}/authorizations`, { token }, rememberPayment)}
          >
            Authorize
          </button>
          <button
            className="secondary"
            disabled={busy || !paymentId}
            onClick={() => void run('Reload payment', `/payments/${paymentId}`, undefined, rememberPayment)}
          >
            Reload
          </button>
          <button
            disabled={busy || !paymentId}
            onClick={() => void run('Capture full amount', `/payments/${paymentId}/captures`, {}, rememberPayment)}
          >
            Capture full amount
          </button>
          <button
            disabled={busy || !paymentId}
            onClick={() => void run('Void', `/payments/${paymentId}/voids`, {}, rememberPayment)}
          >
            Void
          </button>
        </div>
        <label>
          Partial capture, cents
          <input inputMode="numeric" value={captureAmount} onChange={(event) => setCaptureAmount(event.target.value)} />
        </label>
        <button
          disabled={busy || !paymentId}
          onClick={() => void run('Capture partial amount', `/payments/${paymentId}/captures`, {
            amountMinor: Number(captureAmount),
          }, (result) => {
            setPartialCapture(result);
            rememberPayment(result);
          })}
        >
          Capture partial amount
        </button>
        <ResponseBox result={partialCapture} />
        <p className="hint">A capture or void after the authorization window expires the payment instead.</p>
      </section>

      <section>
        <h2>Refund</h2>
        <div className="row two">
          <label>
            Amount in cents
            <input inputMode="numeric" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} />
          </label>
          <label>
            Reason
            <input value={refundReason} onChange={(event) => setRefundReason(event.target.value)} />
          </label>
        </div>
        <div className="actions two">
          <button
            disabled={busy || !paymentId}
            onClick={() => void run('Request refund', `/payments/${paymentId}/refunds`, {
              amountMinor: Number(refundAmount),
              reason: refundReason,
            }, (result) => {
              const refundId = readString(result.body, 'refundId');
              if (refundId) {
                setRefunds((current) => {
                  const without = current.filter((item) => readString(item, 'refundId') !== refundId);
                  return [...without, result.body];
                });
              }
            })}
          >
            Request refund
          </button>
          <button
            className="secondary"
            disabled={busy || !paymentId}
            onClick={() => void run('List refunds', `/payments/${paymentId}/refunds`, undefined, rememberRefunds)}
          >
            List refunds
          </button>
        </div>
        {refunds.map((refund) => {
          const refundId = readString(refund, 'refundId');
          if (!refundId) {
            return null;
          }
          return (
            <div className="refund" key={refundId}>
              <pre>{JSON.stringify(refund, null, 2)}</pre>
              <div className="actions two">
                <button
                  disabled={busy}
                  onClick={() => void run('Complete refund', `/refunds/${refundId}/completions`, {}, (result) => {
                    if (readString(result.body, 'refundId')) {
                      setRefunds((current) => current.map((item) => (
                        readString(item, 'refundId') === refundId ? result.body : item
                      )));
                    }
                  })}
                >
                  Complete
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => void run('Fail refund', `/refunds/${refundId}/failures`, {}, (result) => {
                    if (readString(result.body, 'refundId')) {
                      setRefunds((current) => current.map((item) => (
                        readString(item, 'refundId') === refundId ? result.body : item
                      )));
                    }
                  })}
                >
                  Fail
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2>Merchant balance</h2>
        <button
          disabled={busy || merchantId === ''}
          onClick={() => void run('Balance', `/merchants/${encodeURIComponent(merchantId)}/balance`, undefined, (result) => {
            if (result.status < 300) {
              setBalance(result.body);
            }
          })}
        >
          Load balance
        </button>
        {balance ? <pre>{JSON.stringify(balance, null, 2)}</pre> : <p className="hint">Not loaded yet.</p>}
      </section>

      <section>
        <h2>Last response</h2>
        {log ? (
          <>
            <p>{log.label} · HTTP {log.result.status}</p>
            <pre>{JSON.stringify(log.result.body, null, 2)}</pre>
          </>
        ) : (
          <p className="hint">Each action records the status and body here.</p>
        )}
      </section>
    </main>
  );
}
