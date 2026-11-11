import { GetLinkUseCase } from '../../../links/application/use-cases/get-link.use-case';
import { ClickEventRepository } from '../../domain/repositories/click-event.repository';
import { GetLinkAnalyticsInput, LinkAnalytics } from '../models/link-analytics';

// Only the method analytics calls, so tests and the module boundary stay narrow.
export type LinkOwnershipCheck = Pick<GetLinkUseCase, 'execute'>;

export class GetLinkAnalyticsUseCase {
  constructor(
    private readonly linkOwnershipCheck: LinkOwnershipCheck,
    private readonly clickEventRepository: ClickEventRepository,
  ) {}

  /** @throws LinkNotFoundError (links module) when the link is missing or not the user's. */
  async execute({
    linkId,
    userId,
    page,
    limit,
  }: GetLinkAnalyticsInput): Promise<LinkAnalytics> {
    await this.linkOwnershipCheck.execute({ linkId, userId });

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
