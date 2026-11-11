import { PageRequest } from '../../../../shared/pagination/page-request';
import { Link } from '../entities/link.entity';

export const LINK_REPOSITORY = Symbol('LINK_REPOSITORY');

export interface NewLink {
  ownerId: string;
  shortCode: string;
  destinationUrl: string;
  expiresAt: Date | null;
}

/** Only the fields present are changed; `expiresAt: null` clears the expiry. */
export interface LinkChanges {
  destinationUrl?: string;
  isActive?: boolean;
  expiresAt?: Date | null;
}

export interface LinkRepository {
  /** @throws ShortCodeTakenError when the code exists (enforced by the DB unique index). */
  create(link: NewLink): Promise<Link>;
  findById(id: string): Promise<Link | null>;
  findByShortCode(shortCode: string): Promise<Link | null>;
  /** Newest first. */
  listByOwner(
    ownerId: string,
    pageRequest: PageRequest,
  ): Promise<{ items: Link[]; total: number }>;
  /** @throws LinkNotFoundError when the link no longer exists. */
  update(id: string, changes: LinkChanges): Promise<Link>;
  /** @throws LinkNotFoundError when the link no longer exists. */
  delete(id: string): Promise<void>;
}
