export type Clock = {
  now(): Date;
};

export function systemClock(): Clock {
  return {
    now() {
      return new Date();
    },
  };
}

export function authorizationExpiresAt(authorizedAt: Date, windowDays: number): Date {
  const expiresAt = new Date(authorizedAt.getTime());
  expiresAt.setUTCDate(expiresAt.getUTCDate() + windowDays);
  return expiresAt;
}
