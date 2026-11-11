import { ApiProperty } from '@nestjs/swagger';
import { Link } from '../../../domain/entities/link.entity';

export class LinkResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'aZ3kQ9x' })
  shortCode!: string;

  @ApiProperty({ example: 'http://localhost:3000/aZ3kQ9x' })
  shortUrl!: string;

  @ApiProperty()
  destinationUrl!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: Date, nullable: true })
  expiresAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromLink(link: Link, publicBaseUrl: string): LinkResponse {
    return {
      id: link.id,
      shortCode: link.shortCode,
      shortUrl: `${publicBaseUrl.replace(/\/+$/, '')}/${link.shortCode}`,
      destinationUrl: link.destinationUrl,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }
}
