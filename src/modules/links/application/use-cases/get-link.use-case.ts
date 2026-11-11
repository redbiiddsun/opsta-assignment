import { Link } from '../../domain/entities/link.entity';
import { LinkNotFoundError } from '../../domain/errors/link-not-found.error';
import { LinkRepository } from '../../domain/repositories/link.repository';
import { OwnedLinkInput } from '../models/link-inputs';

// Exposed to other modules only through LinksApi.assertOwnership.
export class GetLinkUseCase {
  constructor(private readonly linkRepository: LinkRepository) {}

  /** @throws LinkNotFoundError when the link is missing or owned by someone else. */
  async execute({ linkId, userId }: OwnedLinkInput): Promise<Link> {
    const link = await this.linkRepository.findById(linkId);
    // Same error for a foreign link as for a missing one: no 403 that confirms it exists.
    if (!link || !link.isOwnedBy(userId)) {
      throw new LinkNotFoundError();
    }
    return link;
  }
}
