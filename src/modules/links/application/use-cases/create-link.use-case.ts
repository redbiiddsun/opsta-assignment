import { Link } from '../../domain/entities/link.entity';
import { ShortCodeTakenError } from '../../domain/errors/short-code-taken.error';
import {
  LinkRepository,
  NewLink,
} from '../../domain/repositories/link.repository';
import { DestinationUrl } from '../../domain/value-objects/destination-url.vo';
import { ShortCode } from '../../domain/value-objects/short-code.vo';
import { ShortCodeGenerator } from '../contracts/short-code-generator';
import { CreateLinkInput } from '../models/link-inputs';

// 62^7 ≈ 3.5e12 codes: three collisions in a row means a broken generator, not bad luck.
export const MAX_SHORT_CODE_ATTEMPTS = 3;

export class CreateLinkUseCase {
  constructor(
    private readonly linkRepository: LinkRepository,
    private readonly shortCodeGenerator: ShortCodeGenerator,
  ) {}

  async execute({
    ownerId,
    destinationUrl,
    alias,
    expiresAt,
  }: CreateLinkInput): Promise<Link> {
    const expiration = expiresAt ?? null;
    Link.assertExpirationInFuture(expiration, new Date());
    const linkWithoutCode = {
      ownerId,
      destinationUrl: DestinationUrl.create(destinationUrl).toString(),
      expiresAt: expiration,
    };

    if (alias !== undefined) {
      // A taken alias is the caller's choice, so it is a 409, not a retry.
      return this.linkRepository.create({
        ...linkWithoutCode,
        shortCode: ShortCode.fromAlias(alias).toString(),
      });
    }
    return this.createWithGeneratedCode(linkWithoutCode);
  }

  // No check-then-insert: the unique index decides, and a collision retries with a new code.
  private async createWithGeneratedCode(
    linkWithoutCode: Omit<NewLink, 'shortCode'>,
  ): Promise<Link> {
    for (let attempt = 1; attempt <= MAX_SHORT_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.linkRepository.create({
          ...linkWithoutCode,
          shortCode: this.shortCodeGenerator.generate(),
        });
      } catch (error) {
        if (!(error instanceof ShortCodeTakenError)) {
          throw error;
        }
      }
    }
    throw new Error(
      `No free short code after ${MAX_SHORT_CODE_ATTEMPTS} attempts`,
    );
  }
}
