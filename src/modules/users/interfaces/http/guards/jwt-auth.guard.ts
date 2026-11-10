import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TOKEN_VERIFIER } from '../../../application/contracts/token-verifier';
import type { TokenVerifier } from '../../../application/contracts/token-verifier';
import { AuthenticatedRequest } from '../models/authenticated-request';

const BEARER_SCHEME = 'Bearer';
const UNAUTHORIZED_MESSAGE = 'Missing or invalid access token';

const readBearerToken = (request: Request): string | null => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme === BEARER_SCHEME && token ? token : null;
};

// Stateless: trusts a valid signature and does not look the user up.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readBearerToken(request);
    if (!token) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    const userId = await this.tokenVerifier.verify(token);
    if (!userId) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }
    request.user = { id: userId };
    return true;
  }
}
