import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import {
  DomainEvent,
  DomainEventHandler,
  DomainEventType,
} from './domain-event';
import { EventPublisher } from './event-publisher';
import { EventSubscriber } from './event-subscriber';

// ponytail: in-memory, best-effort delivery; events are lost if the process
// crashes before handlers finish. Durable delivery needs a transactional outbox.
@Injectable()
export class InProcessEventBus
  implements EventPublisher, EventSubscriber, BeforeApplicationShutdown
{
  private readonly logger = new Logger(InProcessEventBus.name);
  private readonly handlersByEventName = new Map<
    string,
    DomainEventHandler<DomainEvent>[]
  >();
  private readonly pendingDeliveries = new Set<Promise<void>>();

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
      const delivery = new Promise<void>((resolve) =>
        setImmediate(resolve),
      ).then(() => this.runHandler(handler, event));
      this.pendingDeliveries.add(delivery);
      void delivery.finally(() => this.pendingDeliveries.delete(delivery));
    }
  }

  // Runs before onApplicationShutdown, where PrismaService disconnects. Loops
  // because a handler may publish while we wait. Best-effort only: Nest closes
  // the HTTP server later (in dispose), so a redirect served after the drain
  // can still lose its click.
  async beforeApplicationShutdown(): Promise<void> {
    while (this.pendingDeliveries.size > 0) {
      await Promise.all([...this.pendingDeliveries]);
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
