import { InvalidDestinationUrlError } from '../errors/invalid-destination-url.error';

export const MAX_DESTINATION_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export class DestinationUrl {
  private constructor(private readonly value: string) {}

  /** Parses with the WHATWG URL parser (not a regex) and stores the normalized href. */
  static create(rawUrl: string): DestinationUrl {
    const url = URL.parse(rawUrl.trim());
    if (
      !url ||
      !ALLOWED_PROTOCOLS.has(url.protocol) ||
      // `https://bank.com@evil.com` reads as bank.com but goes to evil.com.
      url.username !== '' ||
      url.password !== '' ||
      url.href.length > MAX_DESTINATION_URL_LENGTH
    ) {
      throw new InvalidDestinationUrlError();
    }
    return new DestinationUrl(url.href);
  }

  toString(): string {
    return this.value;
  }
}
