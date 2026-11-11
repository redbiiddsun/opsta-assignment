import { PageRequest } from '../../../../shared/pagination/page-request';
import { ClickEvent } from '../entities/click-event.entity';

export const CLICK_EVENT_REPOSITORY = Symbol('CLICK_EVENT_REPOSITORY');

export interface ClickSummary {
  totalClicks: number;
  lastClickedAt: Date | null;
}

export interface ClickEventRepository {
  /** Idempotent: an already recorded id, or a link deleted meanwhile, is a silent no-op. */
  record(click: ClickEvent): Promise<void>;
  summarize(linkId: string): Promise<ClickSummary>;
  /** Newest first. */
  listByLink(linkId: string, pageRequest: PageRequest): Promise<ClickEvent[]>;
}
