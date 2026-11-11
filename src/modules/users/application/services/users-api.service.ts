import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { UsersApi } from '../contracts/users-api';
import { UserSummary } from '../models/user-summary';

const toSummary = (user: User): UserSummary => ({
  id: user.id,
  email: user.email.toString(),
  createdAt: user.createdAt,
});

export class UsersApiService implements UsersApi {
  constructor(private readonly userRepository: UserRepository) {}

  async create(email: string): Promise<UserSummary> {
    return toSummary(await this.userRepository.create(Email.create(email)));
  }

  async findByEmail(email: string): Promise<UserSummary | null> {
    const user = await this.userRepository.findByEmail(Email.create(email));
    return user ? toSummary(user) : null;
  }
}
