import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  /** @throws EmailAlreadyRegisteredError when the email is taken (enforced by the DB unique constraint). */
  create(email: Email): Promise<User>;
  findByEmail(email: Email): Promise<User | null>;
}
