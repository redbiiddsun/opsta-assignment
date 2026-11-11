import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { hashRefreshToken } from '../services/auth-session-issuer';

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  // Succeeds for unknown tokens too, so logout can't be used to test whether a token exists.
  async execute(refreshToken: string): Promise<void> {
    const storedToken = await this.refreshTokenRepository.findByTokenHash(
      hashRefreshToken(refreshToken),
    );
    if (storedToken) {
      await this.refreshTokenRepository.revoke(storedToken.id);
    }
  }
}
