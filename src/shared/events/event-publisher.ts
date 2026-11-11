import { DomainEvent } from './domain-event';

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface EventPublisher {
  /** Fire-and-forget: returns before handlers run and never throws for a failing handler. */
  publish(event: DomainEvent): void;
}
