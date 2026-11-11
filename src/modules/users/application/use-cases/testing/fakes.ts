import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { User } from '../../../domain/entities/user.entity';
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { PasswordHasher } from '../../contracts/password-hasher';
import { TokenIssuer } from '../../contracts/token-issuer';
import { AuthSessionIssuer } from '../../services/auth-session-issuer';

export const REFRESH_TOKEN_TTL_DAYS = 7;
export const ISSUED_ACCESS_TOKEN = { accessToken: 'jwt', expiresIn: '15m' };

export const createUser = (passwordHash = 'stored-hash'): User =>
  new User(
    'user-id',
    Email.create('user@example.com'),
    passwordHash,
    new Date('2026-01-01T00:00:00Z'),
  );

export const createUserRepositoryMock = (): jest.Mocked<UserRepository> => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
});

export const createPasswordHasherMock = (): jest.Mocked<PasswordHasher> => ({
  hash: jest.fn(),
  verify: jest.fn(),
});

export const createTokenIssuerMock = (): jest.Mocked<TokenIssuer> => ({
  issue: jest.fn(),
});

export const createRefreshTokenRepositoryMock =
  (): jest.Mocked<RefreshTokenRepository> => ({
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
  });

export const ONE_HOUR_MS = 3_600_000;

export const createStoredRefreshToken = ({
  expiresAt = new Date(Date.now() + ONE_HOUR_MS),
  revokedAt = null,
}: { expiresAt?: Date; revokedAt?: Date | null } = {}): RefreshToken =>
  new RefreshToken('token-id', 'user-id', expiresAt, revokedAt);

// The real issuer over mocked ports: tests see the actual token pair it builds.
export const createAuthSessionIssuer = (
  refreshTokenRepository: RefreshTokenRepository,
): AuthSessionIssuer => {
  const tokenIssuer = createTokenIssuerMock();
  tokenIssuer.issue.mockResolvedValue(ISSUED_ACCESS_TOKEN);
  return new AuthSessionIssuer(
    tokenIssuer,
    refreshTokenRepository,
    REFRESH_TOKEN_TTL_DAYS,
  );
};
