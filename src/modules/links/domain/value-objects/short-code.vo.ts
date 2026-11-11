import { InvalidShortCodeError } from '../errors/invalid-short-code.error';

// Generated codes (7 chars of 0-9A-Za-z) also match this, so one rule covers both.
const SHORT_CODE_FORMAT = /^[A-Za-z0-9_-]{3,32}$/;
// Top-level path segments the app serves itself; compared case-insensitively
// because Express routing is case-insensitive.
const RESERVED_ALIASES = new Set(['api']);

export class ShortCode {
  private constructor(private readonly value: string) {}

  static fromAlias(alias: string): ShortCode {
    if (
      !ShortCode.isWellFormed(alias) ||
      RESERVED_ALIASES.has(alias.toLowerCase())
    ) {
      throw new InvalidShortCodeError();
    }
    return new ShortCode(alias);
  }

  /** Lets the redirect reject codes that can't exist without a database query. */
  static isWellFormed(candidate: string): boolean {
    return SHORT_CODE_FORMAT.test(candidate);
  }

  toString(): string {
    return this.value;
  }
}
