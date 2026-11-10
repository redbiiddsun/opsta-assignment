import { InvalidEmailError } from '../errors/invalid-email.error';
import { Email } from './email.vo';

describe('Email', () => {
  it('Given an email with surrounding spaces and capitals, when created, then it is trimmed and lowercased', () => {
    // When
    const email = Email.create('  User@Example.COM ');

    // Then
    expect(email.toString()).toBe('user@example.com');
  });

  it.each(['', 'no-at-sign', 'user@', '@example.com', 'user@host', 'a b@c.d'])(
    'Given the malformed email "%s", when created, then it throws InvalidEmailError',
    (malformedEmail) => {
      // When / Then
      expect(() => Email.create(malformedEmail)).toThrow(InvalidEmailError);
    },
  );

  it('Given an email longer than 254 characters, when created, then it throws InvalidEmailError', () => {
    // Given
    const tooLongEmail = `${'a'.repeat(250)}@example.com`;

    // When / Then
    expect(() => Email.create(tooLongEmail)).toThrow(InvalidEmailError);
  });
});
