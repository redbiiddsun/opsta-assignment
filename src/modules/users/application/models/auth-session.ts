import { AccessToken } from './access-token';

export interface AuthSession extends AccessToken {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
