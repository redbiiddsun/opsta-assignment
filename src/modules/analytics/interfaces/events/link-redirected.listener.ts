import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EVENT_SUBSCRIBER } from '../../../../shared/events/event-subscriber';
import type { EventSubscriber } from '../../../../shared/events/event-subscriber';
import { LinkRedirectedEvent } from '../../../links/application/events/link-redirected.event';
import { RecordClickUseCase } from '../../application/use-cases/record-click.use-case';

// The event-side counterpart of a controller: maps the event to a use case, no rules.
@Injectable()
export class LinkRedirectedListener implements OnModuleInit {
  constructor(
    @Inject(EVENT_SUBSCRIBER) private readonly eventSubscriber: EventSubscriber,
    private readonly recordClickUseCase: RecordClickUseCase,
  ) {}

  onModuleInit(): void {
    this.eventSubscriber.subscribe(LinkRedirectedEvent, (event) =>
      this.recordClickUseCase.execute({
        eventId: event.eventId,
        linkId: event.linkId,
        occurredAt: event.occurredAt,
        referrer: event.referrer,
        userAgent: event.userAgent,
      }),
    );
  }
}
