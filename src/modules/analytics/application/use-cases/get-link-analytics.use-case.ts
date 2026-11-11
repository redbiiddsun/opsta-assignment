import { LinksApi } from '../../../links/application/contracts/links-api';
import { ClickEventRepository } from '../../domain/repositories/click-event.repository';
import { GetLinkAnalyticsInput, LinkAnalytics } from '../models/link-analytics';

export class GetLinkAnalyticsUseCase {
  constructor(
    private readonly linksApi: LinksApi,
    private readonly clickEventRepository: ClickEventRepository,
  ) {}

  /** @throws LinkNotFoundError (links module) when the link is missing or not the user's. */
  async execute({
    linkId,
    userId,
    page,
    limit,
  }: GetLinkAnalyticsInput): Promise<LinkAnalytics> {
    await this.linksApi.assertOwnership({ linkId, userId });

    const [{ totalClicks, lastClickedAt }, items] = await Promise.all([
      this.clickEventRepository.summarize(linkId),
      this.clickEventRepository.listByLink(linkId, { page, limit }),
    ]);
    return {
      totalClicks,
      lastClickedAt,
      clicks: { items, page, limit, total: totalClicks },
    };
  }
}
