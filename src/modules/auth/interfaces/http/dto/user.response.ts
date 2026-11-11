import { ApiProperty } from '@nestjs/swagger';
import { UserSummary } from '../../../../users/application/models/user-summary';

// Explicit allow-list of fields, so nothing else can leak into the response.
export class UserResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromUserSummary({ id, email, createdAt }: UserSummary): UserResponse {
    return { id, email, createdAt };
  }
}
