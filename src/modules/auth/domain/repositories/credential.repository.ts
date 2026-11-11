export const CREDENTIAL_REPOSITORY = Symbol('CREDENTIAL_REPOSITORY');

export interface CredentialRepository {
  create(userId: string, passwordHash: string): Promise<void>;
  findPasswordHash(userId: string): Promise<string | null>;
}
