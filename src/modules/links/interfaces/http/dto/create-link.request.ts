import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsString, MaxLength } from 'class-validator';
import { IsOptionalButNotNull } from '../../../../../shared/http/is-optional-but-not-null.decorator';
import { MAX_DESTINATION_URL_LENGTH } from '../../../domain/value-objects/destination-url.vo';

const MAX_ALIAS_LENGTH = 32;

// Shape checks only; URL, alias and expiry rules live in the domain.
export class CreateLinkRequest {
  @ApiProperty({
    example: 'https://example.com/some/long/path',
    maxLength: MAX_DESTINATION_URL_LENGTH,
  })
  @IsString()
  @MaxLength(MAX_DESTINATION_URL_LENGTH)
  destinationUrl!: string;

  @ApiPropertyOptional({
    example: 'my-link',
    description: '3-32 letters, digits, - or _. Omit for a random code.',
  })
  @IsOptionalButNotNull()
  @IsString()
  @MaxLength(MAX_ALIAS_LENGTH)
  alias?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptionalButNotNull()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
