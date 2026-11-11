import { ExpirationInPastError } from '../errors/expiration-in-past.error';

export class Link {
  constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly shortCode: string,
    readonly destinationUrl: string,
    readonly isActive: boolean,
    readonly expiresAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static assertExpirationInFuture(expiresAt: Date | null, now: Date): void {
    if (expiresAt && expiresAt <= now) {
      throw new ExpirationInPastError();
    }
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  canRedirect(now: Date): boolean {
    return this.isActive && (this.expiresAt === null || this.expiresAt > now);
  }
}
