import { Link } from '../../domain/entities/link.entity';
import {
  LinkChanges,
  LinkRepository,
} from '../../domain/repositories/link.repository';
import { DestinationUrl } from '../../domain/value-objects/destination-url.vo';
import { UpdateLinkInput } from '../models/link-inputs';
import { GetLinkUseCase } from './get-link.use-case';

export class UpdateLinkUseCase {
  constructor(
    private readonly linkRepository: LinkRepository,
    private readonly getLinkUseCase: GetLinkUseCase,
  ) {}

  async execute({
    linkId,
    userId,
    destinationUrl,
    isActive,
    expiresAt,
  }: UpdateLinkInput): Promise<Link> {
    const link = await this.getLinkUseCase.execute({ linkId, userId });

    const changes: LinkChanges = {};
    if (destinationUrl !== undefined) {
      changes.destinationUrl = DestinationUrl.create(destinationUrl).toString();
    }
    if (isActive !== undefined) {
      changes.isActive = isActive;
    }
    if (expiresAt !== undefined) {
      Link.assertExpirationInFuture(expiresAt, new Date());
      changes.expiresAt = expiresAt;
    }

    if (Object.keys(changes).length === 0) {
      return link;
    }
    return this.linkRepository.update(link.id, changes);
  }
}
