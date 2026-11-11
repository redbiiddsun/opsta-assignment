import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
// Bounded so the computed offset stays a safe integer Prisma accepts.
const MAX_PAGE = 10_000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class PaginationQuery {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAGE,
    default: DEFAULT_PAGE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;
}
