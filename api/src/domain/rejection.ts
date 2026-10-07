export type Rejection = {
  rejected: true;
  reason: string;
};

export function reject(reason: string): Rejection {
  return { rejected: true, reason };
}

export function isRejected(result: object): result is Rejection {
  return 'rejected' in result && result.rejected === true;
}
