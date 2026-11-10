import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';
import { InvalidEmailError } from '../../domain/errors/invalid-email.error';
import { RegisterUserUseCase } from './register-user.use-case';
import {
  createPasswordHasherMock,
  createUser,
  createUserRepositoryMock,
} from './testing/fakes';

describe('RegisterUserUseCase', () => {
  const setup = () => {
    const userRepository = createUserRepositoryMock();
    const passwordHasher = createPasswordHasherMock();
    const useCase = new RegisterUserUseCase(userRepository, passwordHasher);
    return { userRepository, passwordHasher, useCase };
  };

  it('Given new credentials, when registering, then the normalized email is stored with the hash, never the plaintext password', async () => {
    // Given
    const { userRepository, passwordHasher, useCase } = setup();
    passwordHasher.hash.mockResolvedValue('argon2-hash');
    userRepository.create.mockResolvedValue(createUser('argon2-hash'));

    // When
    await useCase.execute({
      email: ' User@Example.com',
      password: 'plain-password',
    });

    // Then
    expect(passwordHasher.hash).toHaveBeenCalledWith('plain-password');
    const [storedEmail, storedHash] = userRepository.create.mock.calls[0];
    expect(storedEmail.toString()).toBe('user@example.com');
    expect(storedHash).toBe('argon2-hash');
  });

  it('Given an email that is already registered, when registering, then EmailAlreadyRegisteredError propagates', async () => {
    // Given
    const { userRepository, passwordHasher, useCase } = setup();
    passwordHasher.hash.mockResolvedValue('argon2-hash');
    userRepository.create.mockRejectedValue(new EmailAlreadyRegisteredError());

    // When / Then
    await expect(
      useCase.execute({
        email: 'user@example.com',
        password: 'plain-password',
      }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('Given a malformed email, when registering, then it fails before hashing or storing', async () => {
    // Given
    const { userRepository, passwordHasher, useCase } = setup();

    // When / Then
    await expect(
      useCase.execute({ email: 'not-an-email', password: 'plain-password' }),
    ).rejects.toThrow(InvalidEmailError);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
