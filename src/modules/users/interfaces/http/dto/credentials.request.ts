import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
// Caps hashing cost: argon2 work grows with input, so unbounded passwords are a DoS lever.
const MAX_PASSWORD_LENGTH = 128;

// Shared by register and login: both take exactly email + password.
export class CredentialsRequest {
  @ApiProperty({ example: 'user@example.com', maxLength: MAX_EMAIL_LENGTH })
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email!: string;

  @ApiProperty({
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
  })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password!: string;
}
