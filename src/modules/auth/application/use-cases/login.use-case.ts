import { UsersApi } from '../../../users/application/contracts/users-api';
import { CredentialRepository } from '../../domain/repositories/credential.repository';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { PasswordHasher } from '../contracts/password-hasher';
import { AuthSession } from '../models/auth-session';
import { Credentials } from '../models/credentials';
import { AuthSessionIssuer } from '../services/auth-session-issuer';

// Looked up when the email is unknown, so both paths run the same number of queries.
const NO_USER_ID = '00000000-0000-0000-0000-000000000000';

export class LoginUseCase {
  constructor(
    private readonly usersApi: UsersApi,
    private readonly credentialRepository: CredentialRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly authSessionIssuer: AuthSessionIssuer,
  ) {}

  async execute({ email, password }: Credentials): Promise<AuthSession> {
    const user = await this.usersApi.findByEmail(email);
    const passwordHash = await this.credentialRepository.findPasswordHash(
      user?.id ?? NO_USER_ID,
    );
    // Verify even when the user is missing so both failures take the same time.
    const isPasswordValid = await this.passwordHasher.verify(
      passwordHash,
      password,
    );
    if (!user || !isPasswordValid) {
      throw new InvalidCredentialsError();
    }
    return this.authSessionIssuer.start(user.id);
  }
}
