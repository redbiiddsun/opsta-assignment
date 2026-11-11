import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables } from '../../../../shared/config/env.validation';
import { TokenIssuer } from '../../application/contracts/token-issuer';
import { AccessToken } from '../../application/models/access-token';

// Secret, issuer, audience and expiry are set once on JwtModule in auth.module.ts.
@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async issue(userId: string): Promise<AccessToken> {
    return {
      accessToken: await this.jwtService.signAsync({ sub: userId }),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', { infer: true }),
    };
  }
}
