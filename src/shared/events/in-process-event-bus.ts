import { Injectable, Logger } from '@nestjs/common';
import {
  DomainEvent,
  DomainEventHandler,
  DomainEventType,
} from './domain-event';
import { EventPublisher } from './event-publisher';

// ponytail: in-memory, best-effort delivery; events are lost if the process
// crashes before handlers finish. Durable delivery needs a transactional outbox.
@Injectable()
export class InProcessEventBus implements EventPublisher {
  private readonly logger = new Logger(InProcessEventBus.name);
  private readonly handlersByEventName = new Map<
    string,
    DomainEventHandler<DomainEvent>[]
  >();

  subscribe<TEvent extends DomainEvent>(
    eventType: DomainEventType<TEvent>,
    handler: DomainEventHandler<TEvent>,
  ): void {
    const handlers = this.handlersByEventName.get(eventType.EVENT_NAME) ?? [];
    // Safe: publish only passes events whose eventName matches this type.
    handlers.push(handler as DomainEventHandler<DomainEvent>);
    this.handlersByEventName.set(eventType.EVENT_NAME, handlers);
  }

  publish(event: DomainEvent): void {
    const handlers = this.handlersByEventName.get(event.eventName) ?? [];
    for (const handler of handlers) {
      // Next tick, so the publisher (e.g. a redirect) never waits on handlers.
      setImmediate(() => void this.runHandler(handler, event));
    }
  }

  private async runHandler(
    handler: DomainEventHandler<DomainEvent>,
    event: DomainEvent,
  ): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      this.logger.error(
        `Handler for ${event.eventName} failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
