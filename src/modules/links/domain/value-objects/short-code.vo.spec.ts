import { InvalidShortCodeError } from '../errors/invalid-short-code.error';
import { ShortCode } from './short-code.vo';

describe('ShortCode', () => {
  it.each(['abc', 'My-Link_2026', 'a'.repeat(32)])(
    'Given the alias %p, when creating, then it is kept as given',
    (alias) => {
      // When / Then
      expect(ShortCode.fromAlias(alias).toString()).toBe(alias);
    },
  );

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(33)],
    ['a slash', 'a/b'],
    ['a dot', 'favicon.ico'],
    ['a space', 'my link'],
    ['the reserved word', 'api'],
    ['the reserved word in another case', 'API'],
  ])(
    'Given an alias with %s, when creating, then it is rejected',
    (_case, alias) => {
      // When / Then
      expect(() => ShortCode.fromAlias(alias)).toThrow(InvalidShortCodeError);
    },
  );
});
