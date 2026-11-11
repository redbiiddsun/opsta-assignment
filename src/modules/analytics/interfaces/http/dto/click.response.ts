import { ApiProperty } from '@nestjs/swagger';
import { ClickEvent } from '../../../domain/entities/click-event.entity';

export class ClickResponse {
  @ApiProperty()
  clickedAt!: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://news.example',
  })
  referrerOrigin!: string | null;

  @ApiProperty({ type: String, nullable: true })
  userAgent!: string | null;

  static fromClickEvent(click: ClickEvent): ClickResponse {
    return {
      clickedAt: click.clickedAt,
      referrerOrigin: click.referrerOrigin,
      userAgent: click.userAgent,
    };
  }
}
