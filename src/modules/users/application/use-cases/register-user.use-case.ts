import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHasher } from '../contracts/password-hasher';
import { Credentials } from '../models/credentials';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute({ email, password }: Credentials): Promise<User> {
    const normalizedEmail = Email.create(email);
    const passwordHash = await this.passwordHasher.hash(password);
    // No pre-insert lookup: the DB unique constraint is the race-free duplicate check.
    return this.userRepository.create(normalizedEmail, passwordHash);
  }
}
