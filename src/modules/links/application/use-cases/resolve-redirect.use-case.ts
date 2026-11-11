import { EventPublisher } from '../../../../shared/events/event-publisher';
import { LinkNotFoundError } from '../../domain/errors/link-not-found.error';
import { LinkRepository } from '../../domain/repositories/link.repository';
import { ShortCode } from '../../domain/value-objects/short-code.vo';
import { LinkRedirectedEvent } from '../events/link-redirected.event';
import { ResolveRedirectInput } from '../models/link-inputs';

export class ResolveRedirectUseCase {
  constructor(
    private readonly linkRepository: LinkRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Returns the destination URL.
   * @throws LinkNotFoundError for unknown, inactive and expired codes alike.
   */
  async execute({
    shortCode,
    referrer,
    userAgent,
  }: ResolveRedirectInput): Promise<string> {
    if (!ShortCode.isWellFormed(shortCode)) {
      throw new LinkNotFoundError();
    }
    const now = new Date();
    const link = await this.linkRepository.findByShortCode(shortCode);
    if (!link || !link.canRedirect(now)) {
      throw new LinkNotFoundError();
    }

    // Fire-and-forget: the 302 never waits on, or fails because of, click recording.
    this.eventPublisher.publish(
      new LinkRedirectedEvent(link.id, now, referrer, userAgent),
    );
    return link.destinationUrl;
  }
}
