import { RegisterUserUseCase } from './register-user.use-case';
import {
  USER_SUMMARY,
  createCredentialRepositoryMock,
  createPasswordHasherMock,
  createTransactionRunnerMock,
  createUsersApiMock,
} from './testing/fakes';

class DuplicateEmailError extends Error {}

const credentials = { email: 'user@example.com', password: 'plain-password' };

describe('RegisterUserUseCase', () => {
  const setup = () => {
    const usersApi = createUsersApiMock();
    const credentialRepository = createCredentialRepositoryMock();
    const passwordHasher = createPasswordHasherMock();
    const transactionRunner = createTransactionRunnerMock();
    passwordHasher.hash.mockResolvedValue('argon2-hash');
    const useCase = new RegisterUserUseCase(
      usersApi,
      credentialRepository,
      passwordHasher,
      transactionRunner,
    );
    return {
      usersApi,
      credentialRepository,
      passwordHasher,
      transactionRunner,
      useCase,
    };
  };

  it('Given new credentials, when registering, then the user and the hashed credential are created in one transaction', async () => {
    // Given
    const {
      usersApi,
      credentialRepository,
      passwordHasher,
      transactionRunner,
      useCase,
    } = setup();
    usersApi.create.mockResolvedValue(USER_SUMMARY);

    // When
    const user = await useCase.execute(credentials);

    // Then
    expect(passwordHasher.hash).toHaveBeenCalledWith('plain-password');
    expect(transactionRunner.runInTransaction).toHaveBeenCalledTimes(1);
    expect(usersApi.create).toHaveBeenCalledWith('user@example.com');
    expect(credentialRepository.create).toHaveBeenCalledWith(
      'user-id',
      'argon2-hash',
    );
    expect(user).toEqual(USER_SUMMARY);
  });

  it('Given the users API rejects the email, when registering, then the error from the users API propagates and no credential is created', async () => {
    // Given
    const { usersApi, credentialRepository, useCase } = setup();
    usersApi.create.mockRejectedValue(new DuplicateEmailError());

    // When / Then
    await expect(useCase.execute(credentials)).rejects.toThrow(
      DuplicateEmailError,
    );
    expect(credentialRepository.create).not.toHaveBeenCalled();
  });
});
