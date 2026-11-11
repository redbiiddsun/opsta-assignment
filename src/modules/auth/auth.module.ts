import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { EnvironmentVariables } from '../../shared/config/env.validation';
import {
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '../../shared/database/transaction-runner';
import { USERS_API, UsersApi } from '../users/application/contracts/users-api';
import { UsersModule } from '../users/users.module';
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
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from './domain/repositories/credential.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from './domain/repositories/refresh-token.repository';
import { PrismaCredentialRepository } from './infrastructure/persistence/prisma-credential.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma-refresh-token.repository';
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
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: createJwtOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: CREDENTIAL_REPOSITORY, useClass: PrismaCredentialRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    { provide: TOKEN_VERIFIER, useClass: JwtTokenVerifier },
    {
      provide: RegisterUserUseCase,
      inject: [
        USERS_API,
        CREDENTIAL_REPOSITORY,
        PASSWORD_HASHER,
        TRANSACTION_RUNNER,
      ],
      useFactory: (
        usersApi: UsersApi,
        credentialRepository: CredentialRepository,
        passwordHasher: PasswordHasher,
        transactionRunner: TransactionRunner,
      ) =>
        new RegisterUserUseCase(
          usersApi,
          credentialRepository,
          passwordHasher,
          transactionRunner,
        ),
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
      inject: [
        USERS_API,
        CREDENTIAL_REPOSITORY,
        PASSWORD_HASHER,
        AuthSessionIssuer,
      ],
      useFactory: (
        usersApi: UsersApi,
        credentialRepository: CredentialRepository,
        passwordHasher: PasswordHasher,
        authSessionIssuer: AuthSessionIssuer,
      ) =>
        new LoginUseCase(
          usersApi,
          credentialRepository,
          passwordHasher,
          authSessionIssuer,
        ),
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
  // Other modules import AuthModule and use @UseGuards(JwtAuthGuard); the guard
  // is resolved in their injector, so its TOKEN_VERIFIER dependency is exported too.
  exports: [JwtAuthGuard, TOKEN_VERIFIER],
})
export class AuthModule {}
