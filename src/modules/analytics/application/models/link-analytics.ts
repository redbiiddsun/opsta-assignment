import { ClickEvent } from '../../domain/entities/click-event.entity';

export interface LinkAnalytics {
  totalClicks: number;
  lastClickedAt: Date | null;
  clicks: {
    items: ClickEvent[];
    page: number;
    limit: number;
    total: number;
  };
}

export interface GetLinkAnalyticsInput {
  linkId: string;
  userId: string;
  page: number;
  limit: number;
}
