import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../domain/entities/user.entity';

// Explicit allow-list of fields: passwordHash can never reach a response.
export class UserResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromUser(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email.toString(),
      createdAt: user.createdAt,
    };
  }
}
