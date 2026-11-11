import { ApiProperty } from '@nestjs/swagger';
import { ClickResponse } from './click.response';

export class ClickPageResponse {
  @ApiProperty({ type: [ClickResponse] })
  items!: ClickResponse[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
