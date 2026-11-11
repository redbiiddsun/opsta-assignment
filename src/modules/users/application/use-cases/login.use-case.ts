import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { UserRepository } from '../../domain/repositories/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHasher } from '../contracts/password-hasher';
import { AuthSession } from '../models/auth-session';
import { Credentials } from '../models/credentials';
import { AuthSessionIssuer } from '../services/auth-session-issuer';

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly authSessionIssuer: AuthSessionIssuer,
  ) {}

  async execute({ email, password }: Credentials): Promise<AuthSession> {
    const user = await this.userRepository.findByEmail(Email.create(email));
    // Verify even when the user is missing so both failures take the same time.
    const isPasswordValid = await this.passwordHasher.verify(
      user?.passwordHash ?? null,
      password,
    );
    if (!user || !isPasswordValid) {
      throw new InvalidCredentialsError();
    }
    return this.authSessionIssuer.start(user.id);
  }
}
