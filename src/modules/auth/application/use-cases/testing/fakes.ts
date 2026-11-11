import { TransactionRunner } from '../../../../../shared/database/transaction-runner';
import { UsersApi } from '../../../../users/application/contracts/users-api';
import { UserSummary } from '../../../../users/application/models/user-summary';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { CredentialRepository } from '../../../domain/repositories/credential.repository';
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository';
import { PasswordHasher } from '../../contracts/password-hasher';
import { TokenIssuer } from '../../contracts/token-issuer';
import { AuthSessionIssuer } from '../../services/auth-session-issuer';

export const REFRESH_TOKEN_TTL_DAYS = 7;
export const ISSUED_ACCESS_TOKEN = { accessToken: 'jwt', expiresIn: '15m' };

export const USER_SUMMARY: UserSummary = {
  id: 'user-id',
  email: 'user@example.com',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

export const createUsersApiMock = (): jest.Mocked<UsersApi> => ({
  create: jest.fn(),
  findByEmail: jest.fn(),
});

export const createCredentialRepositoryMock =
  (): jest.Mocked<CredentialRepository> => ({
    create: jest.fn(),
    findPasswordHash: jest.fn(),
  });

// Runs the work inline (spied, so tests can assert it was used); atomicity
// itself is the database's job and is covered by e2e.
export const createTransactionRunnerMock = (): TransactionRunner => {
  const transactionRunner: TransactionRunner = {
    runInTransaction: (work) => work(),
  };
  jest.spyOn(transactionRunner, 'runInTransaction');
  return transactionRunner;
};

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
