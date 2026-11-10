import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { PasswordHasher } from '../../contracts/password-hasher';
import { TokenIssuer } from '../../contracts/token-issuer';

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
