import type { BalanceReader } from '../ports/repositories';

export async function handleGetBalance(input: { merchantId: string; balances: BalanceReader }) {
  const balance = await input.balances.foldForMerchant(input.merchantId);
  return { balance };
}
