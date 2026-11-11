import {
  createLink,
  ONE_HOUR_MS,
} from '../../application/use-cases/testing/fakes';
import { ExpirationInPastError } from '../errors/expiration-in-past.error';
import { Link } from './link.entity';

const NOW = new Date('2026-06-01T12:00:00Z');

describe('Link', () => {
  it.each([
    ['active with no expiry', { isActive: true, expiresAt: null }, true],
    [
      'active and not yet expired',
      { isActive: true, expiresAt: new Date(NOW.getTime() + ONE_HOUR_MS) },
      true,
    ],
    ['inactive', { isActive: false, expiresAt: null }, false],
    [
      'expired',
      { isActive: true, expiresAt: new Date(NOW.getTime() - ONE_HOUR_MS) },
      false,
    ],
    ['expiring exactly now', { isActive: true, expiresAt: NOW }, false],
  ])(
    'Given a link that is %s, when checking canRedirect, then it returns %p',
    (_case, state, expected) => {
      // When / Then
      expect(createLink(state).canRedirect(NOW)).toBe(expected);
    },
  );

  it('Given its owner and another user, when checking ownership, then only the owner owns it', () => {
    // Given
    const link = createLink();

    // When / Then
    expect(link.isOwnedBy(link.ownerId)).toBe(true);
    expect(link.isOwnedBy('someone-else')).toBe(false);
  });

  it.each([
    ['in the past', new Date(NOW.getTime() - 1)],
    ['exactly now', NOW],
  ])(
    'Given an expiration %s, when asserting, then it is rejected',
    (_case, expiresAt) => {
      // When / Then
      expect(() => Link.assertExpirationInFuture(expiresAt, NOW)).toThrow(
        ExpirationInPastError,
      );
    },
  );

  it.each([
    ['in the future', new Date(NOW.getTime() + 1)],
    ['absent', null],
  ])(
    'Given an expiration %s, when asserting, then it is accepted',
    (_case, expiresAt) => {
      // When / Then
      expect(() => Link.assertExpirationInFuture(expiresAt, NOW)).not.toThrow();
    },
  );
});
