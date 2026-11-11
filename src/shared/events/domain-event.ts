export interface DomainEvent {
  readonly eventName: string;
}

// The event class itself, so subscribers name an event by type instead of a string.
export interface DomainEventType<TEvent extends DomainEvent> {
  readonly EVENT_NAME: string;
  new (...args: never[]): TEvent;
}

export type DomainEventHandler<TEvent extends DomainEvent> = (
  event: TEvent,
) => Promise<void> | void;
