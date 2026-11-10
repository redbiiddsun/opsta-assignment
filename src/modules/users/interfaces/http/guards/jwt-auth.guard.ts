import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedRequest } from '../models/authenticated-request';

const BEARER_SCHEME = 'Bearer';
const UNAUTHORIZED_MESSAGE = 'Missing or invalid access token';

interface AccessTokenPayload {
  sub: string;
}

const readBearerToken = (request: Request): string | null => {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme === BEARER_SCHEME && token ? token : null;
};

// Stateless: trusts a valid signature and does not look the user up.
// Issuer, audience and expiry are checked by JwtModule's verifyOptions.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readBearerToken(request);
    if (!token) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    const payload = await this.verify(token);
    request.user = { id: payload.sub };
    return true;
  }

  private async verify(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      // Every failure reason (signature, expiry, iss/aud) gets the same 401 on purpose.
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }
  }
}
