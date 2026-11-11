import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { hashRefreshToken } from '../services/auth-session-issuer';
import { LoginUseCase } from './login.use-case';
import {
  ISSUED_ACCESS_TOKEN,
  USER_SUMMARY,
  createAuthSessionIssuer,
  createCredentialRepositoryMock,
  createPasswordHasherMock,
  createRefreshTokenRepositoryMock,
  createUsersApiMock,
} from './testing/fakes';

const credentials = { email: 'user@example.com', password: 'plain-password' };

describe('LoginUseCase', () => {
  const setup = () => {
    const usersApi = createUsersApiMock();
    const credentialRepository = createCredentialRepositoryMock();
    const passwordHasher = createPasswordHasherMock();
    const refreshTokenRepository = createRefreshTokenRepositoryMock();
    const useCase = new LoginUseCase(
      usersApi,
      credentialRepository,
      passwordHasher,
      createAuthSessionIssuer(refreshTokenRepository),
    );
    return {
      usersApi,
      credentialRepository,
      passwordHasher,
      refreshTokenRepository,
      useCase,
    };
  };

  it('Given valid credentials, when logging in, then an access token and a new refresh token are issued', async () => {
    // Given
    const {
      usersApi,
      credentialRepository,
      passwordHasher,
      refreshTokenRepository,
      useCase,
    } = setup();
    usersApi.findByEmail.mockResolvedValue(USER_SUMMARY);
    credentialRepository.findPasswordHash.mockResolvedValue('stored-hash');
    passwordHasher.verify.mockResolvedValue(true);

    // When
    const session = await useCase.execute(credentials);

    // Then
    expect(credentialRepository.findPasswordHash).toHaveBeenCalledWith(
      'user-id',
    );
    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'stored-hash',
      'plain-password',
    );
    expect(session).toMatchObject(ISSUED_ACCESS_TOKEN);
    expect(refreshTokenRepository.create).toHaveBeenCalledWith({
      userId: 'user-id',
      tokenHash: hashRefreshToken(session.refreshToken),
      expiresAt: session.refreshTokenExpiresAt,
    });
  });

  it('Given an unknown email, when logging in, then the same lookups and verify still run and InvalidCredentialsError is thrown', async () => {
    // Given
    const {
      usersApi,
      credentialRepository,
      passwordHasher,
      refreshTokenRepository,
      useCase,
    } = setup();
    usersApi.findByEmail.mockResolvedValue(null);
    credentialRepository.findPasswordHash.mockResolvedValue(null);
    passwordHasher.verify.mockResolvedValue(false);

    // When / Then
    await expect(useCase.execute(credentials)).rejects.toThrow(
      InvalidCredentialsError,
    );
    expect(credentialRepository.findPasswordHash).toHaveBeenCalledTimes(1);
    expect(passwordHasher.verify).toHaveBeenCalledWith(null, 'plain-password');
    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
  });

  it('Given a wrong password, when logging in, then the same InvalidCredentialsError is thrown', async () => {
    // Given
    const {
      usersApi,
      credentialRepository,
      passwordHasher,
      refreshTokenRepository,
      useCase,
    } = setup();
    usersApi.findByEmail.mockResolvedValue(USER_SUMMARY);
    credentialRepository.findPasswordHash.mockResolvedValue('stored-hash');
    passwordHasher.verify.mockResolvedValue(false);

    // When / Then
    await expect(useCase.execute(credentials)).rejects.toThrow(
      new InvalidCredentialsError(),
    );
    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
  });
});
