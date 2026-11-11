import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenVerifier } from '../../application/contracts/token-verifier';

// sub is checked at runtime: verifyAsync's generic is only a cast.
interface AccessTokenPayload {
  sub?: unknown;
}

// Secret, issuer and audience come from JwtModule's verifyOptions in auth.module.ts;
// expiry is checked by default.
@Injectable()
export class JwtTokenVerifier implements TokenVerifier {
  constructor(private readonly jwtService: JwtService) {}

  async verify(accessToken: string): Promise<string | null> {
    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
      return typeof payload.sub === 'string' && payload.sub
        ? payload.sub
        : null;
    } catch {
      // Every rejection reason collapses to null on purpose: callers give one generic 401.
      return null;
    }
  }
}
