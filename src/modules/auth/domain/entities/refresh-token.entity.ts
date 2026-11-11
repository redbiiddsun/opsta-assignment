export class RefreshToken {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly expiresAt: Date,
    readonly revokedAt: Date | null,
  ) {}

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return this.expiresAt <= now;
  }
}
