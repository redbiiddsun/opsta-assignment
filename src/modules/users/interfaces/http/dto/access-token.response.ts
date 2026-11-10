import { ApiProperty } from '@nestjs/swagger';
import { AccessToken } from '../../../application/models/access-token';

const BEARER_TOKEN_TYPE = 'Bearer';

export class AccessTokenResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: BEARER_TOKEN_TYPE })
  tokenType!: string;

  @ApiProperty({ example: '15m' })
  expiresIn!: string;

  static fromAccessToken({
    accessToken,
    expiresIn,
  }: AccessToken): AccessTokenResponse {
    return { accessToken, tokenType: BEARER_TOKEN_TYPE, expiresIn };
  }
}
