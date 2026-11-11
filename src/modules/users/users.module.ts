import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { EnvironmentVariables } from '../../shared/config/env.validation';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from './application/contracts/password-hasher';
import {
  TOKEN_ISSUER,
  TokenIssuer,
} from './application/contracts/token-issuer';
import { TOKEN_VERIFIER } from './application/contracts/token-verifier';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { AuthSessionIssuer } from './application/services/auth-session-issuer';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from './domain/repositories/refresh-token.repository';
import {
  USER_REPOSITORY,
  UserRepository,
} from './domain/repositories/user.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';
import { JwtTokenVerifier } from './infrastructure/security/jwt-token-verifier';
import { AuthController } from './interfaces/http/controllers/auth.controller';
import { JwtAuthGuard } from './interfaces/http/guards/jwt-auth.guard';

const createJwtOptions = (
  configService: ConfigService<EnvironmentVariables, true>,
) => {
  const issuer = configService.get('JWT_ISSUER', { infer: true });
  const audience = configService.get('JWT_AUDIENCE', { infer: true });
  const expiresIn = configService.get('JWT_EXPIRES_IN', { infer: true });
  return {
    secret: configService.get('JWT_SECRET', { infer: true }),
    signOptions: {
      issuer,
      audience,
      // Format is checked at boot by env validation.
      expiresIn: expiresIn as JwtSignOptions['expiresIn'],
    },
    verifyOptions: { issuer, audience },
  };
};

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: createJwtOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    { provide: TOKEN_VERIFIER, useClass: JwtTokenVerifier },
    {
      provide: RegisterUserUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
      ) => new RegisterUserUseCase(userRepository, passwordHasher),
    },
    {
      provide: AuthSessionIssuer,
      inject: [TOKEN_ISSUER, REFRESH_TOKEN_REPOSITORY, ConfigService],
      useFactory: (
        tokenIssuer: TokenIssuer,
        refreshTokenRepository: RefreshTokenRepository,
        configService: ConfigService<EnvironmentVariables, true>,
      ) =>
        new AuthSessionIssuer(
          tokenIssuer,
          refreshTokenRepository,
          configService.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }),
        ),
    },
    {
      provide: LoginUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, AuthSessionIssuer],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        authSessionIssuer: AuthSessionIssuer,
      ) => new LoginUseCase(userRepository, passwordHasher, authSessionIssuer),
    },
    {
      provide: RefreshSessionUseCase,
      inject: [REFRESH_TOKEN_REPOSITORY, AuthSessionIssuer],
      useFactory: (
        refreshTokenRepository: RefreshTokenRepository,
        authSessionIssuer: AuthSessionIssuer,
      ) => new RefreshSessionUseCase(refreshTokenRepository, authSessionIssuer),
    },
    {
      provide: LogoutUseCase,
      inject: [REFRESH_TOKEN_REPOSITORY],
      useFactory: (refreshTokenRepository: RefreshTokenRepository) =>
        new LogoutUseCase(refreshTokenRepository),
    },
    JwtAuthGuard,
  ],
  // Other modules import UsersModule and use @UseGuards(JwtAuthGuard); the guard
  // is resolved in their injector, so its TOKEN_VERIFIER dependency is exported too.
  exports: [JwtAuthGuard, TOKEN_VERIFIER],
})
export class UsersModule {}
