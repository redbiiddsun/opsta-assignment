import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { LoginUseCase } from './login.use-case';
import {
  createPasswordHasherMock,
  createTokenIssuerMock,
  createUser,
  createUserRepositoryMock,
} from './testing/fakes';

const credentials = { email: 'user@example.com', password: 'plain-password' };

describe('LoginUseCase', () => {
  const setup = () => {
    const userRepository = createUserRepositoryMock();
    const passwordHasher = createPasswordHasherMock();
    const tokenIssuer = createTokenIssuerMock();
    const useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      tokenIssuer,
    );
    return { userRepository, passwordHasher, tokenIssuer, useCase };
  };

  it('Given valid credentials, when logging in, then a token is issued for the user', async () => {
    // Given
    const { userRepository, passwordHasher, tokenIssuer, useCase } = setup();
    userRepository.findByEmail.mockResolvedValue(createUser('stored-hash'));
    passwordHasher.verify.mockResolvedValue(true);
    const issuedToken = { accessToken: 'jwt', expiresIn: '15m' };
    tokenIssuer.issue.mockResolvedValue(issuedToken);

    // When
    const accessToken = await useCase.execute(credentials);

    // Then
    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'stored-hash',
      'plain-password',
    );
    expect(tokenIssuer.issue).toHaveBeenCalledWith('user-id');
    expect(accessToken).toEqual(issuedToken);
  });

  it('Given an unknown email, when logging in, then the password is still verified and InvalidCredentialsError is thrown', async () => {
    // Given
    const { userRepository, passwordHasher, tokenIssuer, useCase } = setup();
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.verify.mockResolvedValue(false);

    // When / Then
    await expect(useCase.execute(credentials)).rejects.toThrow(
      InvalidCredentialsError,
    );
    expect(passwordHasher.verify).toHaveBeenCalledWith(null, 'plain-password');
    expect(tokenIssuer.issue).not.toHaveBeenCalled();
  });

  it('Given a wrong password, when logging in, then the same InvalidCredentialsError is thrown', async () => {
    // Given
    const { userRepository, passwordHasher, tokenIssuer, useCase } = setup();
    userRepository.findByEmail.mockResolvedValue(createUser());
    passwordHasher.verify.mockResolvedValue(false);

    // When / Then
    await expect(useCase.execute(credentials)).rejects.toThrow(
      new InvalidCredentialsError(),
    );
    expect(tokenIssuer.issue).not.toHaveBeenCalled();
  });
});
