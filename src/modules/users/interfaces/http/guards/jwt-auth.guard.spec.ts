import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from '../models/authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';

const SECRET = 'test-secret-with-at-least-32-characters';
const ISSUER = 'test-issuer';
const AUDIENCE = 'test-audience';

const jwtService = new JwtService({
  secret: SECRET,
  signOptions: { issuer: ISSUER, audience: AUDIENCE, expiresIn: '15m' },
  verifyOptions: { issuer: ISSUER, audience: AUDIENCE },
});

const createContext = (authorization?: string) => {
  const request = { headers: { authorization } } as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
};

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(jwtService);

  it('Given a valid bearer token, when the guard runs, then it allows the request and sets the user id', async () => {
    // Given
    const token = await jwtService.signAsync({ sub: 'user-id' });
    const { request, context } = createContext(`Bearer ${token}`);

    // When
    const isAllowed = await guard.canActivate(context);

    // Then
    expect(isAllowed).toBe(true);
    expect(request.user).toEqual({ id: 'user-id' });
  });

  it.each([
    ['a missing header', undefined],
    ['a non-bearer scheme', 'Basic dXNlcjpwYXNz'],
    ['an empty bearer token', 'Bearer '],
    ['a malformed token', 'Bearer not-a-jwt'],
  ])(
    'Given %s, when the guard runs, then it rejects with 401',
    async (_case, authorization) => {
      // Given
      const { context } = createContext(authorization);

      // When / Then
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    },
  );

  it.each([
    ['an expired token', { expiresIn: -1 }],
    ['a wrong audience', { audience: 'other-audience' }],
    ['a wrong issuer', { issuer: 'other-issuer' }],
    ['a different signing secret', { secret: 'x'.repeat(32) }],
  ])(
    'Given %s, when the guard runs, then it rejects with 401',
    async (_case, overrides) => {
      // Given
      const token = await jwtService.signAsync({ sub: 'user-id' }, overrides);
      const { context } = createContext(`Bearer ${token}`);

      // When / Then
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    },
  );
});
