import { AccessToken } from '../models/access-token';

export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export interface TokenIssuer {
  issue(userId: string): Promise<AccessToken>;
}
