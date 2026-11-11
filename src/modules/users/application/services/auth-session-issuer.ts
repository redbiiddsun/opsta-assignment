import { createHash, randomBytes } from 'node:crypto';
import {
  NewRefreshToken,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { TokenIssuer } from '../contracts/token-issuer';
import { AccessToken } from '../models/access-token';
import { AuthSession } from '../models/auth-session';

const REFRESH_TOKEN_BYTES = 32;
const MILLISECONDS_PER_DAY = 86_400_000;

// SHA-256, not Argon2: the token is 256 random bits, so it can't be brute-forced,
// and a deterministic hash lets the unique index find the row.
export const hashRefreshToken = (refreshToken: string): string =>
  createHash('sha256').update(refreshToken).digest('hex');

const toSession = (
  accessToken: AccessToken,
  refreshToken: string,
  refreshTokenExpiresAt: Date,
): AuthSession => ({ ...accessToken, refreshToken, refreshTokenExpiresAt });

// Issues the access + refresh token pair for login (start) and refresh (rotate).
export class AuthSessionIssuer {
  constructor(
    private readonly tokenIssuer: TokenIssuer,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly refreshTokenTtlDays: number,
  ) {}

  // Both flows sign the access token before committing the refresh token: a
  // signing failure after the commit would revoke the client's refresh token
  // without handing back its replacement.
  async start(userId: string): Promise<AuthSession> {
    const accessToken = await this.tokenIssuer.issue(userId);
    const { refreshToken, record } = this.createRefreshToken(userId);
    await this.refreshTokenRepository.create(record);
    return toSession(accessToken, refreshToken, record.expiresAt);
  }

  /** Returns null when `currentTokenId` was already rotated by a concurrent request. */
  async rotate(
    currentTokenId: string,
    userId: string,
  ): Promise<AuthSession | null> {
    const accessToken = await this.tokenIssuer.issue(userId);
    const { refreshToken, record } = this.createRefreshToken(userId);
    const isRotated = await this.refreshTokenRepository.rotate(
      currentTokenId,
      record,
    );
    return isRotated
      ? toSession(accessToken, refreshToken, record.expiresAt)
      : null;
  }

  private createRefreshToken(userId: string): {
    refreshToken: string;
    record: NewRefreshToken;
  } {
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.refreshTokenTtlDays * MILLISECONDS_PER_DAY,
    );
    return {
      refreshToken,
      record: {
        userId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt,
      },
    };
  }
}
