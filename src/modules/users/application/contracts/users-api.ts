import { UserSummary } from '../models/user-summary';

export const USERS_API = Symbol('USERS_API');

// The users module's public API: other modules use this, never its repository or tables.
export interface UsersApi {
  /**
   * Normalizes the email first.
   * @throws InvalidEmailError for a malformed email
   * @throws EmailAlreadyRegisteredError when the email is taken
   */
  create(email: string): Promise<UserSummary>;
  /** @throws InvalidEmailError for a malformed email */
  findByEmail(email: string): Promise<UserSummary | null>;
}
