import { User } from '../../domain/entities/user.entity';
import { InvalidEmailError } from '../../domain/errors/invalid-email.error';
import { UserRepository } from '../../domain/repositories/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { UsersApiService } from './users-api.service';

const CREATED_AT = new Date('2026-01-01T00:00:00Z');
const USER = new User('user-id', Email.create('user@example.com'), CREATED_AT);
const USER_SUMMARY = {
  id: 'user-id',
  email: 'user@example.com',
  createdAt: CREATED_AT,
};

describe('UsersApiService', () => {
  const setup = () => {
    const userRepository: jest.Mocked<UserRepository> = {
      create: jest.fn(),
      findByEmail: jest.fn(),
    };
    return { userRepository, usersApi: new UsersApiService(userRepository) };
  };

  it('Given a mixed-case email, when creating a user, then the normalized email is stored and a summary is returned', async () => {
    // Given
    const { userRepository, usersApi } = setup();
    userRepository.create.mockResolvedValue(USER);

    // When
    const summary = await usersApi.create(' User@Example.com');

    // Then
    const [storedEmail] = userRepository.create.mock.calls[0];
    expect(storedEmail.toString()).toBe('user@example.com');
    expect(summary).toEqual(USER_SUMMARY);
  });

  it('Given a malformed email, when creating a user, then InvalidEmailError is thrown before storing', async () => {
    // Given
    const { userRepository, usersApi } = setup();

    // When / Then
    await expect(usersApi.create('not-an-email')).rejects.toThrow(
      InvalidEmailError,
    );
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['a registered email', USER, USER_SUMMARY],
    ['an unknown email', null, null],
  ])(
    'Given %s, when finding by email, then it looks up the normalized email',
    async (_case, storedUser, expected) => {
      // Given
      const { userRepository, usersApi } = setup();
      userRepository.findByEmail.mockResolvedValue(storedUser);

      // When
      const summary = await usersApi.findByEmail('USER@example.com');

      // Then
      const [lookedUpEmail] = userRepository.findByEmail.mock.calls[0];
      expect(lookedUpEmail.toString()).toBe('user@example.com');
      expect(summary).toEqual(expected);
    },
  );
});
