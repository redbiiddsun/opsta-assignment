import { randomUUID } from 'node:crypto';
import { DomainEvent } from '../../../../shared/events/domain-event';

// Public contract of the links module: analytics subscribes to it.
// Carries no IP address and no request object (AGENTS.md §5, §7).
export class LinkRedirectedEvent implements DomainEvent {
  static readonly EVENT_NAME = 'links.link-redirected';
  readonly eventName = LinkRedirectedEvent.EVENT_NAME;
  // Lets consumers record idempotently if delivery ever becomes at-least-once.
  readonly eventId = randomUUID();

  constructor(
    readonly linkId: string,
    readonly occurredAt: Date,
    readonly referrer: string | null,
    readonly userAgent: string | null,
  ) {}
}
