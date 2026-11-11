import { LinkNotFoundError } from '../../../links/application/contracts/links-api';
import { GetLinkAnalyticsUseCase } from './get-link-analytics.use-case';
import {
  createClickEvent,
  createClickEventRepositoryMock,
  createLinksApiMock,
  LINK_ID,
  USER_ID,
} from './testing/fakes';

const INPUT = { linkId: LINK_ID, userId: USER_ID, page: 2, limit: 10 };

describe('GetLinkAnalyticsUseCase', () => {
  const setup = () => {
    const linksApi = createLinksApiMock();
    const clickEventRepository = createClickEventRepositoryMock();
    const useCase = new GetLinkAnalyticsUseCase(linksApi, clickEventRepository);
    return { linksApi, clickEventRepository, useCase };
  };

  it('Given the owner, when getting analytics, then the summary and the requested page are returned', async () => {
    // Given
    const { linksApi, clickEventRepository, useCase } = setup();
    const lastClickedAt = new Date('2026-01-02T00:00:00Z');
    clickEventRepository.summarize.mockResolvedValue({
      totalClicks: 11,
      lastClickedAt,
    });
    const clicks = [createClickEvent()];
    clickEventRepository.listByLink.mockResolvedValue(clicks);

    // When
    const analytics = await useCase.execute(INPUT);

    // Then
    expect(linksApi.assertOwnership).toHaveBeenCalledWith({
      linkId: LINK_ID,
      userId: USER_ID,
    });
    expect(clickEventRepository.listByLink).toHaveBeenCalledWith(LINK_ID, {
      page: 2,
      limit: 10,
    });
    expect(analytics).toEqual({
      totalClicks: 11,
      lastClickedAt,
      clicks: { items: clicks, page: 2, limit: 10, total: 11 },
    });
  });

  it('Given a link the user does not own, when getting analytics, then LinkNotFoundError propagates and no clicks are read', async () => {
    // Given
    const { linksApi, clickEventRepository, useCase } = setup();
    linksApi.assertOwnership.mockRejectedValue(new LinkNotFoundError());

    // When / Then
    await expect(useCase.execute(INPUT)).rejects.toThrow(LinkNotFoundError);
    expect(clickEventRepository.summarize).not.toHaveBeenCalled();
    expect(clickEventRepository.listByLink).not.toHaveBeenCalled();
  });
});
