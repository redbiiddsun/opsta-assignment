export interface CreateLinkInput {
  ownerId: string;
  destinationUrl: string;
  alias?: string;
  expiresAt?: Date;
}

export interface OwnedLinkInput {
  linkId: string;
  userId: string;
}

export interface UpdateLinkInput extends OwnedLinkInput {
  destinationUrl?: string;
  isActive?: boolean;
  expiresAt?: Date | null;
}

export interface ListLinksInput {
  ownerId: string;
  page: number;
  limit: number;
}

export interface ResolveRedirectInput {
  shortCode: string;
  referrer: string | null;
  userAgent: string | null;
}
