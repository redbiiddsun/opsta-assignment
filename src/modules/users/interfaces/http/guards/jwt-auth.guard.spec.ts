import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenVerifier } from '../../../application/contracts/token-verifier';
import { AuthenticatedRequest } from '../models/authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';

const VALID_TOKEN = 'valid-token';

// Accepts only VALID_TOKEN; real JWT checks are covered by jwt-token-verifier.spec.ts.
const fakeTokenVerifier: TokenVerifier = {
  verify: (accessToken) =>
    Promise.resolve(accessToken === VALID_TOKEN ? 'user-id' : null),
};

const createContext = (authorization?: string) => {
  const request = { headers: { authorization } } as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
};

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(fakeTokenVerifier);

  it('Given a valid bearer token, when the guard runs, then it allows the request and sets the user id', async () => {
    // Given
    const { request, context } = createContext(`Bearer ${VALID_TOKEN}`);

    // When
    const isAllowed = await guard.canActivate(context);

    // Then
    expect(isAllowed).toBe(true);
    expect(request.user).toEqual({ id: 'user-id' });
  });

  it.each([
    ['a missing header', undefined],
    ['a non-bearer scheme', `Basic ${VALID_TOKEN}`],
    ['an empty bearer token', 'Bearer '],
    ['a token the verifier rejects', 'Bearer rejected-token'],
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
});
