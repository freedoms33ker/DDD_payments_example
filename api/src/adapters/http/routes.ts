import type { Express, Request } from 'express';
import { sendResult, type HandlerResult } from './present';

type Handlers = {
  initiatePayment(input: { merchantId: unknown; amountMinor: unknown; idempotencyKey: unknown }): Promise<HandlerResult>;
  authorizePayment(input: { paymentId: string; token: unknown }): Promise<HandlerResult>;
  capturePayment(input: { paymentId: string; amountMinor: unknown }): Promise<HandlerResult>;
  voidPayment(input: { paymentId: string }): Promise<HandlerResult>;
  getPayment(input: { paymentId: string }): Promise<HandlerResult>;
  listRefunds(input: { paymentId: string }): Promise<HandlerResult>;
  requestRefund(input: { paymentId: string; amountMinor: unknown; reason: unknown }): Promise<HandlerResult>;
  completeRefund(input: { refundId: string }): Promise<HandlerResult>;
  failRefund(input: { refundId: string }): Promise<HandlerResult>;
  getBalance(input: { merchantId: string }): Promise<HandlerResult>;
};

function bodyOf(req: Request): Record<string, unknown> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  return {};
}

export function registerPaymentRoutes(app: Express, handlers: Handlers): void {
  app.post('/payments', async (req, res, next) => {
    try {
      const body = bodyOf(req);
      const result = await handlers.initiatePayment({
        merchantId: body.merchantId,
        amountMinor: body.amountMinor,
        idempotencyKey: body.idempotencyKey,
      });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/payments/:paymentId/authorizations', async (req, res, next) => {
    try {
      const result = await handlers.authorizePayment({
        paymentId: req.params.paymentId,
        token: bodyOf(req).token,
      });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/payments/:paymentId/captures', async (req, res, next) => {
    try {
      const body = bodyOf(req);
      const result = await handlers.capturePayment({
        paymentId: req.params.paymentId,
        amountMinor: Object.prototype.hasOwnProperty.call(body, 'amountMinor') ? body.amountMinor : undefined,
      });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/payments/:paymentId/voids', async (req, res, next) => {
    try {
      const result = await handlers.voidPayment({ paymentId: req.params.paymentId });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/payments/:paymentId', async (req, res, next) => {
    try {
      const result = await handlers.getPayment({ paymentId: req.params.paymentId });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/payments/:paymentId/refunds', async (req, res, next) => {
    try {
      const result = await handlers.listRefunds({ paymentId: req.params.paymentId });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/payments/:paymentId/refunds', async (req, res, next) => {
    try {
      const body = bodyOf(req);
      const result = await handlers.requestRefund({
        paymentId: req.params.paymentId,
        amountMinor: body.amountMinor,
        reason: body.reason,
      });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/refunds/:refundId/completions', async (req, res, next) => {
    try {
      const result = await handlers.completeRefund({ refundId: req.params.refundId });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/refunds/:refundId/failures', async (req, res, next) => {
    try {
      const result = await handlers.failRefund({ refundId: req.params.refundId });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/merchants/:merchantId/balance', async (req, res, next) => {
    try {
      const result = await handlers.getBalance({ merchantId: req.params.merchantId });
      sendResult(res, result);
    } catch (error) {
      next(error);
    }
  });
}
