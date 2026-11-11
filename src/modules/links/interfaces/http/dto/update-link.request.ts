import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsOptionalButNotNull } from '../../../../../shared/http/is-optional-but-not-null.decorator';
import { MAX_DESTINATION_URL_LENGTH } from '../../../domain/value-objects/destination-url.vo';

// Every field optional; an empty body changes nothing. The short code can't change.
export class UpdateLinkRequest {
  @ApiPropertyOptional({ maxLength: MAX_DESTINATION_URL_LENGTH })
  @IsOptionalButNotNull()
  @IsString()
  @MaxLength(MAX_DESTINATION_URL_LENGTH)
  destinationUrl?: string;

  @ApiPropertyOptional()
  @IsOptionalButNotNull()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'null removes the expiry',
  })
  // Skips validation only when absent; null is a real value meaning "never expires".
  @ValidateIf((_request, value) => value !== undefined && value !== null)
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;
}
