import { hashRefreshToken } from '../services/auth-session-issuer';
import { LogoutUseCase } from './logout.use-case';
import {
  createRefreshTokenRepositoryMock,
  createStoredRefreshToken,
} from './testing/fakes';

const PRESENTED_TOKEN = 'presented-refresh-token';

describe('LogoutUseCase', () => {
  it('Given a known refresh token, when logging out, then that token is revoked', async () => {
    // Given
    const refreshTokenRepository = createRefreshTokenRepositoryMock();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      createStoredRefreshToken(),
    );

    // When
    await new LogoutUseCase(refreshTokenRepository).execute(PRESENTED_TOKEN);

    // Then
    expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
      hashRefreshToken(PRESENTED_TOKEN),
    );
    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('token-id');
  });

  it('Given an unknown refresh token, when logging out, then it succeeds without revoking anything', async () => {
    // Given
    const refreshTokenRepository = createRefreshTokenRepositoryMock();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    // When / Then
    await expect(
      new LogoutUseCase(refreshTokenRepository).execute(PRESENTED_TOKEN),
    ).resolves.toBeUndefined();
    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });
});
