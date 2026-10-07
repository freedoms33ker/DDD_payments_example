export type MerchantBalance = {
  capturedTotal: number;
  refundedTotal: number;
  netBalance: number;
  pendingRefunds: number;
  authorizedNotCaptured: number;
};
