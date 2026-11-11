import { RefreshToken } from '../entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface NewRefreshToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenRepository {
  create(refreshToken: NewRefreshToken): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  /**
   * Atomically revokes `currentId` and stores `next`. Returns false, storing nothing,
   * when `currentId` was already revoked (a concurrent refresh used it first).
   */
  rotate(currentId: string, next: NewRefreshToken): Promise<boolean>;
  /** Revokes one token; a no-op when it is already revoked. */
  revoke(id: string): Promise<void>;
}
