import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('Given a hashed password, when verified with the same password, then it matches and the hash is argon2id', async () => {
    // Given
    const passwordHash = await hasher.hash('correct-password');

    // When
    const isMatch = await hasher.verify(passwordHash, 'correct-password');

    // Then
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain('correct-password');
    expect(isMatch).toBe(true);
  });

  it('Given a hashed password, when verified with a different password, then it does not match', async () => {
    // Given
    const passwordHash = await hasher.hash('correct-password');

    // When / Then
    await expect(hasher.verify(passwordHash, 'wrong-password')).resolves.toBe(
      false,
    );
  });

  it('Given no stored hash, when verified, then it does not match', async () => {
    // When / Then
    await expect(hasher.verify(null, 'any-password')).resolves.toBe(false);
  });
});
