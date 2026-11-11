import { OwnedLinkInput } from '../models/link-inputs';

// The error is part of the contract, so callers import it from here, not from links/domain.
export { LinkNotFoundError } from '../../domain/errors/link-not-found.error';

export const LINKS_API = Symbol('LINKS_API');

// The links module's public API: other modules use this, never its repository or tables.
export interface LinksApi {
  /** @throws LinkNotFoundError when the link is missing or owned by someone else. */
  assertOwnership(input: OwnedLinkInput): Promise<void>;
}
