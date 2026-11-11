import { TransactionRunner } from '../../../../shared/database/transaction-runner';
import { UsersApi } from '../../../users/application/contracts/users-api';
import { UserSummary } from '../../../users/application/models/user-summary';
import { CredentialRepository } from '../../domain/repositories/credential.repository';
import { PasswordHasher } from '../contracts/password-hasher';
import { Credentials } from '../models/credentials';

export class RegisterUserUseCase {
  constructor(
    private readonly usersApi: UsersApi,
    private readonly credentialRepository: CredentialRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute({ email, password }: Credentials): Promise<UserSummary> {
    // Hash outside the transaction: Argon2 is slow and must not hold a DB connection.
    const passwordHash = await this.passwordHasher.hash(password);
    // One transaction, so a failed credential insert can't leave a user who can never log in.
    return this.transactionRunner.runInTransaction(async () => {
      // No pre-insert lookup: the DB unique constraint is the race-free duplicate check.
      const user = await this.usersApi.create(email);
      await this.credentialRepository.create(user.id, passwordHash);
      return user;
    });
  }
}
