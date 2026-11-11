export const MAX_REFERRER_ORIGIN_LENGTH = 255;
export const MAX_USER_AGENT_LENGTH = 512;
const WEB_PROTOCOLS = new Set(['http:', 'https:']);

export interface RedirectFacts {
  eventId: string;
  linkId: string;
  occurredAt: Date;
  referrer: string | null;
  userAgent: string | null;
}

export class ClickEvent {
  constructor(
    readonly id: string,
    readonly linkId: string,
    readonly clickedAt: Date,
    readonly referrerOrigin: string | null,
    readonly userAgent: string | null,
  ) {}

  /** Keeps only what the MVP needs: the referrer's origin and a size-bounded user agent. */
  static fromRedirect({
    eventId,
    linkId,
    occurredAt,
    referrer,
    userAgent,
  }: RedirectFacts): ClickEvent {
    return new ClickEvent(
      eventId,
      linkId,
      occurredAt,
      toReferrerOrigin(referrer),
      userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
    );
  }
}

// Origin only: a referrer's path and query can carry personal data.
const toReferrerOrigin = (referrer: string | null): string | null => {
  const url = referrer ? URL.parse(referrer) : null;
  if (
    !url ||
    !WEB_PROTOCOLS.has(url.protocol) ||
    url.origin.length > MAX_REFERRER_ORIGIN_LENGTH
  ) {
    return null;
  }
  return url.origin;
};
