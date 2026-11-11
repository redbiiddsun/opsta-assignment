import {
  DomainEvent,
  DomainEventHandler,
  DomainEventType,
} from './domain-event';

export const EVENT_SUBSCRIBER = Symbol('EVENT_SUBSCRIBER');

export interface EventSubscriber {
  subscribe<TEvent extends DomainEvent>(
    eventType: DomainEventType<TEvent>,
    handler: DomainEventHandler<TEvent>,
  ): void;
}
