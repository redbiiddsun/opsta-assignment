import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { UserRepository } from '../../domain/repositories/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHasher } from '../contracts/password-hasher';
import { TokenIssuer } from '../contracts/token-issuer';
import { AccessToken } from '../models/access-token';
import { Credentials } from '../models/credentials';

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenIssuer: TokenIssuer,
  ) {}

  async execute({ email, password }: Credentials): Promise<AccessToken> {
    const user = await this.userRepository.findByEmail(Email.create(email));
    // Verify even when the user is missing so both failures take the same time.
    const isPasswordValid = await this.passwordHasher.verify(
      user?.passwordHash ?? null,
      password,
    );
    if (!user || !isPasswordValid) {
      throw new InvalidCredentialsError();
    }
    return this.tokenIssuer.issue(user.id);
  }
}
