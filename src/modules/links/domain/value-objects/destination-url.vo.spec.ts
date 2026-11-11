import { InvalidDestinationUrlError } from '../errors/invalid-destination-url.error';
import {
  DestinationUrl,
  MAX_DESTINATION_URL_LENGTH,
} from './destination-url.vo';

describe('DestinationUrl', () => {
  it.each([
    ['http://example.com', 'http://example.com/'],
    ['  HTTPS://Example.COM/a?b=1#c ', 'https://example.com/a?b=1#c'],
  ])(
    'Given %p, when creating, then it is accepted and normalized to %p',
    (rawUrl, normalizedUrl) => {
      // When
      const destinationUrl = DestinationUrl.create(rawUrl);

      // Then
      expect(destinationUrl.toString()).toBe(normalizedUrl);
    },
  );

  it.each([
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['an ftp: URL', 'ftp://example.com/file'],
    ['a relative URL', '/just/a/path'],
    ['malformed input', 'not a url'],
    ['embedded credentials', 'https://bank.com@evil.com/'],
    [
      'a URL over the length limit',
      `https://example.com/${'a'.repeat(MAX_DESTINATION_URL_LENGTH)}`,
    ],
  ])('Given %s, when creating, then it is rejected', (_case, rawUrl) => {
    // When / Then
    expect(() => DestinationUrl.create(rawUrl)).toThrow(
      InvalidDestinationUrlError,
    );
  });
});
