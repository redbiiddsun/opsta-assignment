import { ApiProperty } from '@nestjs/swagger';
import { AuthSession } from '../../../application/models/auth-session';

const BEARER_TOKEN_TYPE = 'Bearer';

export class AuthSessionResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: BEARER_TOKEN_TYPE })
  tokenType!: string;

  @ApiProperty({ example: '15m' })
  expiresIn!: string;

  @ApiProperty({ description: 'Opaque, single-use; send to /auth/refresh' })
  refreshToken!: string;

  @ApiProperty()
  refreshTokenExpiresAt!: Date;

  static fromAuthSession({
    accessToken,
    expiresIn,
    refreshToken,
    refreshTokenExpiresAt,
  }: AuthSession): AuthSessionResponse {
    return {
      accessToken,
      tokenType: BEARER_TOKEN_TYPE,
      expiresIn,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }
}
