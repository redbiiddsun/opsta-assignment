import {
  ClickEvent,
  MAX_USER_AGENT_LENGTH,
  RedirectFacts,
} from './click-event.entity';

const redirectFacts = (
  overrides: Partial<RedirectFacts> = {},
): RedirectFacts => ({
  eventId: 'event-id',
  linkId: 'link-id',
  occurredAt: new Date('2026-01-01T00:00:00Z'),
  referrer: null,
  userAgent: null,
  ...overrides,
});

describe('ClickEvent.fromRedirect', () => {
  it('Given redirect facts, when building a click, then the event id becomes the click id and the time is kept', () => {
    // Given
    const facts = redirectFacts();

    // When
    const click = ClickEvent.fromRedirect(facts);

    // Then
    expect(click).toEqual(
      new ClickEvent('event-id', 'link-id', facts.occurredAt, null, null),
    );
  });

  it.each([
    [
      'a full https URL',
      'https://News.example:8443/post/1?user=42#top',
      'https://news.example:8443',
    ],
    ['an http URL', 'http://blog.example/a', 'http://blog.example'],
    ['an app referrer', 'android-app://com.example.app/', null],
    ['a malformed value', 'not a url', null],
    ['an empty value', '', null],
    ['no referrer', null, null],
    [
      'an origin over the column size',
      `https://${'a'.repeat(250)}.example/`,
      null,
    ],
  ])(
    'Given %s as referrer, when building a click, then referrerOrigin is %p',
    (_case, referrer, expectedOrigin) => {
      // When
      const click = ClickEvent.fromRedirect(redirectFacts({ referrer }));

      // Then
      expect(click.referrerOrigin).toBe(expectedOrigin);
    },
  );

  it('Given an oversized user agent, when building a click, then it is truncated to the column size', () => {
    // When
    const click = ClickEvent.fromRedirect(
      redirectFacts({ userAgent: 'x'.repeat(MAX_USER_AGENT_LENGTH + 100) }),
    );

    // Then
    expect(click.userAgent).toHaveLength(MAX_USER_AGENT_LENGTH);
  });

  it('Given an empty user agent, when building a click, then it is stored as null', () => {
    // When / Then
    expect(
      ClickEvent.fromRedirect(redirectFacts({ userAgent: '' })).userAgent,
    ).toBeNull();
  });
});
