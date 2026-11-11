import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Issued tokens are 43 chars (32 bytes, base64url); the cap only bounds hashing work.
const MAX_REFRESH_TOKEN_LENGTH = 128;

// Shared by refresh and logout: both take exactly the refresh token.
export class RefreshTokenRequest {
  @ApiProperty({ maxLength: MAX_REFRESH_TOKEN_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_REFRESH_TOKEN_LENGTH)
  refreshToken!: string;
}
