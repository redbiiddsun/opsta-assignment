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
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import {
  USER_REPOSITORY,
  UserRepository,
} from './domain/repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';
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
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    {
      provide: RegisterUserUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
      ) => new RegisterUserUseCase(userRepository, passwordHasher),
    },
    {
      provide: LoginUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        tokenIssuer: TokenIssuer,
      ) => new LoginUseCase(userRepository, passwordHasher, tokenIssuer),
    },
    JwtAuthGuard,
  ],
  // Other modules import UsersModule and use @UseGuards(JwtAuthGuard);
  // the guard resolves JwtService in their injector, hence JwtModule here.
  exports: [JwtAuthGuard, JwtModule],
})
export class UsersModule {}
