import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error';
import { hashRefreshToken } from '../services/auth-session-issuer';
import { RefreshSessionUseCase } from './refresh-session.use-case';
import {
  ISSUED_ACCESS_TOKEN,
  createAuthSessionIssuer,
  createRefreshTokenRepositoryMock,
  createStoredRefreshToken,
} from './testing/fakes';

const PRESENTED_TOKEN = 'presented-refresh-token';

describe('RefreshSessionUseCase', () => {
  const setup = () => {
    const refreshTokenRepository = createRefreshTokenRepositoryMock();
    const useCase = new RefreshSessionUseCase(
      refreshTokenRepository,
      createAuthSessionIssuer(refreshTokenRepository),
    );
    return { refreshTokenRepository, useCase };
  };

  it('Given an active refresh token, when refreshing, then it is rotated into a new token', async () => {
    // Given
    const { refreshTokenRepository, useCase } = setup();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      createStoredRefreshToken(),
    );
    refreshTokenRepository.rotate.mockResolvedValue(true);

    // When
    const session = await useCase.execute(PRESENTED_TOKEN);

    // Then
    expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
      hashRefreshToken(PRESENTED_TOKEN),
    );
    expect(refreshTokenRepository.rotate).toHaveBeenCalledWith('token-id', {
      userId: 'user-id',
      tokenHash: hashRefreshToken(session.refreshToken),
      expiresAt: session.refreshTokenExpiresAt,
    });
    expect(session.refreshToken).not.toBe(PRESENTED_TOKEN);
    expect(session).toMatchObject(ISSUED_ACCESS_TOKEN);
  });

  it('Given an unknown refresh token, when refreshing, then InvalidRefreshTokenError is thrown', async () => {
    // Given
    const { refreshTokenRepository, useCase } = setup();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    // When / Then
    await expect(useCase.execute(PRESENTED_TOKEN)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
    expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
  });

  it('Given an expired refresh token, when refreshing, then InvalidRefreshTokenError is thrown and nothing is rotated', async () => {
    // Given
    const { refreshTokenRepository, useCase } = setup();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      createStoredRefreshToken({ expiresAt: new Date(Date.now() - 1) }),
    );

    // When / Then
    await expect(useCase.execute(PRESENTED_TOKEN)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
    expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
  });

  it('Given a revoked refresh token, when refreshing, then InvalidRefreshTokenError is thrown and nothing is rotated', async () => {
    // Given
    const { refreshTokenRepository, useCase } = setup();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      createStoredRefreshToken({ revokedAt: new Date() }),
    );

    // When / Then
    await expect(useCase.execute(PRESENTED_TOKEN)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
    expect(refreshTokenRepository.rotate).not.toHaveBeenCalled();
  });

  it('Given a concurrent refresh rotated the token first, when refreshing, then InvalidRefreshTokenError is thrown', async () => {
    // Given
    const { refreshTokenRepository, useCase } = setup();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      createStoredRefreshToken(),
    );
    refreshTokenRepository.rotate.mockResolvedValue(false);

    // When / Then
    await expect(useCase.execute(PRESENTED_TOKEN)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });
});
