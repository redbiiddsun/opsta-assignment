import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../../../application/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from '../../../application/use-cases/register-user.use-case';
import { AuthSessionResponse } from '../dto/auth-session.response';
import { CredentialsRequest } from '../dto/credentials.request';
import { RefreshTokenRequest } from '../dto/refresh-token.request';
import { UserResponse } from '../dto/user.response';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@ApiBadRequestResponse({ description: 'Invalid request body' })
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
@Throttle(AUTH_THROTTLE)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  @ApiCreatedResponse({ type: UserResponse })
  @ApiConflictResponse({ description: 'Email is already registered' })
  async register(
    @Body() credentials: CredentialsRequest,
  ): Promise<UserResponse> {
    return UserResponse.fromUser(
      await this.registerUserUseCase.execute(credentials),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(
    @Body() credentials: CredentialsRequest,
  ): Promise<AuthSessionResponse> {
    return AuthSessionResponse.fromAuthSession(
      await this.loginUseCase.execute(credentials),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: AuthSessionResponse,
    description: 'New token pair; the sent refresh token is now revoked',
  })
  @ApiUnauthorizedResponse({
    description: 'Unknown, expired or revoked refresh token',
  })
  async refresh(
    @Body() { refreshToken }: RefreshTokenRequest,
  ): Promise<AuthSessionResponse> {
    return AuthSessionResponse.fromAuthSession(
      await this.refreshSessionUseCase.execute(refreshToken),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Session revoked (also returned for unknown tokens)',
  })
  async logout(@Body() { refreshToken }: RefreshTokenRequest): Promise<void> {
    await this.logoutUseCase.execute(refreshToken);
  }
}
