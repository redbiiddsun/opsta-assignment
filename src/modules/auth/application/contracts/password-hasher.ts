export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  /**
   * A null hash (unknown user) must still cost a full verification and return
   * false, so login timing doesn't reveal whether an email is registered.
   */
  verify(passwordHash: string | null, plainPassword: string): Promise<boolean>;
}
