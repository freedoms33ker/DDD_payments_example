import type { Acquirer, AcquirerDecision } from '../../ports/acquirer';

const DECISIONS: Record<string, AcquirerDecision> = {
  tok_ok: { approved: true, authCode: 'auth_ok' },
  tok_insufficient: { approved: false, declineReason: 'InsufficientFunds' },
  tok_declined: { approved: false, declineReason: 'CardDeclined' },
  tok_bad: { approved: false, declineReason: 'InvalidToken' },
};

export function fakeAcquirer(): Acquirer {
  return {
    authorize(token) {
      return DECISIONS[token] ?? { approved: false, declineReason: 'InvalidToken' };
    },
  };
}
