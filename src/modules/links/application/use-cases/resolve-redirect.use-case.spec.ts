import { LinkNotFoundError } from '../../domain/errors/link-not-found.error';
import { LinkRedirectedEvent } from '../events/link-redirected.event';
import { ResolveRedirectUseCase } from './resolve-redirect.use-case';
import {
  createEventPublisherMock,
  createLink,
  createLinkRepositoryMock,
  ONE_HOUR_MS,
} from './testing/fakes';

const REQUEST_HEADERS = { referrer: 'https://ref.example/', userAgent: 'jest' };

describe('ResolveRedirectUseCase', () => {
  const setup = () => {
    const linkRepository = createLinkRepositoryMock();
    const eventPublisher = createEventPublisherMock();
    const useCase = new ResolveRedirectUseCase(linkRepository, eventPublisher);
    return { linkRepository, eventPublisher, useCase };
  };

  it('Given an active link, when resolving its code, then the destination is returned and one LinkRedirected event is published', async () => {
    // Given
    const { linkRepository, eventPublisher, useCase } = setup();
    const link = createLink();
    linkRepository.findByShortCode.mockResolvedValue(link);

    // When
    const destinationUrl = await useCase.execute({
      shortCode: link.shortCode,
      ...REQUEST_HEADERS,
    });

    // Then
    expect(destinationUrl).toBe(link.destinationUrl);
    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: LinkRedirectedEvent.EVENT_NAME,
        linkId: link.id,
        occurredAt: expect.any(Date),
        referrer: REQUEST_HEADERS.referrer,
        userAgent: REQUEST_HEADERS.userAgent,
      }),
    );
  });

  it.each([
    ['unknown', null],
    ['inactive', createLink({ isActive: false })],
    ['expired', createLink({ expiresAt: new Date(Date.now() - ONE_HOUR_MS) })],
  ])(
    'Given an %s code, when resolving, then LinkNotFoundError is thrown and no event is published',
    async (_case, storedLink) => {
      // Given
      const { linkRepository, eventPublisher, useCase } = setup();
      linkRepository.findByShortCode.mockResolvedValue(storedLink);

      // When / Then
      await expect(
        useCase.execute({ shortCode: 'abc1234', ...REQUEST_HEADERS }),
      ).rejects.toThrow(LinkNotFoundError);
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    },
  );

  it('Given a code that cannot exist, when resolving, then it is not found without a database lookup', async () => {
    // Given
    const { linkRepository, useCase } = setup();

    // When / Then
    await expect(
      useCase.execute({ shortCode: 'favicon.ico', ...REQUEST_HEADERS }),
    ).rejects.toThrow(LinkNotFoundError);
    expect(linkRepository.findByShortCode).not.toHaveBeenCalled();
  });
});
