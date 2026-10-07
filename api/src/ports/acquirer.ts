export type AcquirerDecision =
  | { approved: true; authCode: string }
  | { approved: false; declineReason: string };

export type Acquirer = {
  authorize(token: string, amount: number): AcquirerDecision;
};
