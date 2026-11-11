import { ApiProperty } from '@nestjs/swagger';
import { LinkAnalytics } from '../../../application/models/link-analytics';
import { ClickPageResponse } from './click-page.response';
import { ClickResponse } from './click.response';

export class LinkAnalyticsResponse {
  @ApiProperty()
  totalClicks!: number;

  @ApiProperty({ type: Date, nullable: true })
  lastClickedAt!: Date | null;

  @ApiProperty({ type: ClickPageResponse })
  clicks!: ClickPageResponse;

  static fromLinkAnalytics({
    totalClicks,
    lastClickedAt,
    clicks,
  }: LinkAnalytics): LinkAnalyticsResponse {
    return {
      totalClicks,
      lastClickedAt,
      clicks: {
        ...clicks,
        items: clicks.items.map((click) => ClickResponse.fromClickEvent(click)),
      },
    };
  }
}
