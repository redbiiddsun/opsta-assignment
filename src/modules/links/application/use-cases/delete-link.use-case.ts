import { LinkRepository } from '../../domain/repositories/link.repository';
import { OwnedLinkInput } from '../models/link-inputs';
import { GetLinkUseCase } from './get-link.use-case';

export class DeleteLinkUseCase {
  constructor(
    private readonly linkRepository: LinkRepository,
    private readonly getLinkUseCase: GetLinkUseCase,
  ) {}

  async execute(input: OwnedLinkInput): Promise<void> {
    const link = await this.getLinkUseCase.execute(input);
    await this.linkRepository.delete(link.id);
  }
}
