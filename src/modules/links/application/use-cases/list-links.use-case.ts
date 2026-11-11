import { LinkRepository } from '../../domain/repositories/link.repository';
import { LinkPage } from '../models/link-page';
import { ListLinksInput } from '../models/link-inputs';

export class ListLinksUseCase {
  constructor(private readonly linkRepository: LinkRepository) {}

  async execute({ ownerId, page, limit }: ListLinksInput): Promise<LinkPage> {
    const { items, total } = await this.linkRepository.listByOwner(ownerId, {
      page,
      limit,
    });
    return { items, page, limit, total };
  }
}
