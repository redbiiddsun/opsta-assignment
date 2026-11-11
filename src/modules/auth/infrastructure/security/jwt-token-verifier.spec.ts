import { JwtService } from '@nestjs/jwt';
import { JwtTokenVerifier } from './jwt-token-verifier';

const SECRET = 'test-secret-with-at-least-32-characters';
const ISSUER = 'test-issuer';
const AUDIENCE = 'test-audience';

const jwtService = new JwtService({
  secret: SECRET,
  signOptions: { issuer: ISSUER, audience: AUDIENCE, expiresIn: '15m' },
  verifyOptions: { issuer: ISSUER, audience: AUDIENCE },
});

describe('JwtTokenVerifier', () => {
  const verifier = new JwtTokenVerifier(jwtService);

  it('Given a valid token, when it is verified, then it returns the user id', async () => {
    // Given
    const token = await jwtService.signAsync({ sub: 'user-id' });

    // When
    const userId = await verifier.verify(token);

    // Then
    expect(userId).toBe('user-id');
  });

  it('Given a malformed token, when it is verified, then it returns null', async () => {
    // When / Then
    await expect(verifier.verify('not-a-jwt')).resolves.toBeNull();
  });

  it('Given a signed token without sub, when it is verified, then it returns null', async () => {
    // Given
    const token = await jwtService.signAsync({});

    // When / Then
    await expect(verifier.verify(token)).resolves.toBeNull();
  });

  it.each([
    ['an expired token', { expiresIn: -1 }],
    ['a wrong audience', { audience: 'other-audience' }],
    ['a wrong issuer', { issuer: 'other-issuer' }],
    ['a different signing secret', { secret: 'x'.repeat(32) }],
  ])(
    'Given %s, when it is verified, then it returns null',
    async (_case, overrides) => {
      // Given
      const token = await jwtService.signAsync({ sub: 'user-id' }, overrides);

      // When / Then
      await expect(verifier.verify(token)).resolves.toBeNull();
    },
  );
});
