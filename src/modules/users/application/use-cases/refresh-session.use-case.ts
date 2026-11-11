import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { AuthSession } from '../models/auth-session';
import {
  AuthSessionIssuer,
  hashRefreshToken,
} from '../services/auth-session-issuer';

export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly authSessionIssuer: AuthSessionIssuer,
  ) {}

  async execute(refreshToken: string): Promise<AuthSession> {
    const storedToken = await this.refreshTokenRepository.findByTokenHash(
      hashRefreshToken(refreshToken),
    );
    if (!storedToken) {
      throw new InvalidRefreshTokenError();
    }
    // ponytail: a revoked token is just rejected; add token families + reuse
    // detection (revoke the whole chain) if stolen refresh tokens become a concern.
    if (storedToken.isRevoked() || storedToken.isExpired(new Date())) {
      throw new InvalidRefreshTokenError();
    }

    const session = await this.authSessionIssuer.rotate(
      storedToken.id,
      storedToken.userId,
    );
    if (!session) {
      // Lost a race with another refresh of the same token, which already rotated it.
      throw new InvalidRefreshTokenError();
    }
    return session;
  }
}
