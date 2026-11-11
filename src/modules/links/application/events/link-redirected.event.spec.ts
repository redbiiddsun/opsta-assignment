import { LinkRedirectedEvent } from './link-redirected.event';

describe('LinkRedirectedEvent', () => {
  it('Given two events for the same redirect facts, when created, then each has its own eventId', () => {
    // Given
    const occurredAt = new Date();

    // When
    const first = new LinkRedirectedEvent('link-id', occurredAt, null, null);
    const second = new LinkRedirectedEvent('link-id', occurredAt, null, null);

    // Then
    expect(first.eventId).toEqual(expect.any(String));
    expect(first.eventId).not.toBe(second.eventId);
  });
});
