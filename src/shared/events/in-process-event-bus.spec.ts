import { Logger } from '@nestjs/common';
import { DomainEvent } from './domain-event';
import { InProcessEventBus } from './in-process-event-bus';

class SampleEvent implements DomainEvent {
  static readonly EVENT_NAME = 'test.sample';
  readonly eventName = SampleEvent.EVENT_NAME;
  constructor(readonly value: string) {}
}

class OtherEvent implements DomainEvent {
  static readonly EVENT_NAME = 'test.other';
  readonly eventName = OtherEvent.EVENT_NAME;
}

const nextTick = () => new Promise((resolve) => setImmediate(resolve));

describe('InProcessEventBus', () => {
  it('Given a subscriber, when a matching event is published, then the handler receives it after publish returns', async () => {
    // Given
    const eventBus = new InProcessEventBus();
    const handler = jest.fn();
    eventBus.subscribe(SampleEvent, handler);
    const event = new SampleEvent('payload');

    // When
    eventBus.publish(event);

    // Then
    expect(handler).not.toHaveBeenCalled();
    await nextTick();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('Given a subscriber to another event, when an event is published, then that handler is not called', async () => {
    // Given
    const eventBus = new InProcessEventBus();
    const handler = jest.fn();
    eventBus.subscribe(OtherEvent, handler);

    // When
    eventBus.publish(new SampleEvent('payload'));
    await nextTick();

    // Then
    expect(handler).not.toHaveBeenCalled();
  });

  it('Given a failing handler, when an event is published, then the error is logged and other handlers still run', async () => {
    // Given
    const eventBus = new InProcessEventBus();
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const healthyHandler = jest.fn();
    eventBus.subscribe(SampleEvent, () => Promise.reject(new Error('boom')));
    eventBus.subscribe(SampleEvent, healthyHandler);

    // When
    expect(() => eventBus.publish(new SampleEvent('payload'))).not.toThrow();
    await nextTick();
    await nextTick();

    // Then
    expect(healthyHandler).toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith(
      'Handler for test.sample failed',
      expect.stringContaining('boom'),
    );
    loggerError.mockRestore();
  });

  it('Given a delivery still pending, when the app shuts down, then shutdown waits for the handler to finish', async () => {
    // Given
    const eventBus = new InProcessEventBus();
    let isHandled = false;
    eventBus.subscribe(SampleEvent, async () => {
      await nextTick();
      isHandled = true;
    });
    eventBus.publish(new SampleEvent('payload'));

    // When
    await eventBus.beforeApplicationShutdown();

    // Then
    expect(isHandled).toBe(true);
  });

  it('Given a handler that publishes another event, when the app shuts down, then shutdown waits for both deliveries', async () => {
    // Given
    const eventBus = new InProcessEventBus();
    let isFollowUpHandled = false;
    eventBus.subscribe(SampleEvent, () => eventBus.publish(new OtherEvent()));
    eventBus.subscribe(OtherEvent, async () => {
      await nextTick();
      isFollowUpHandled = true;
    });
    eventBus.publish(new SampleEvent('payload'));

    // When
    await eventBus.beforeApplicationShutdown();

    // Then
    expect(isFollowUpHandled).toBe(true);
  });
});
