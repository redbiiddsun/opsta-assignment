import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { RegisterUserUseCase } from '../../../application/use-cases/register-user.use-case';
import { AccessTokenResponse } from '../dto/access-token.response';
import { CredentialsRequest } from '../dto/credentials.request';
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
  @ApiOkResponse({ type: AccessTokenResponse })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(
    @Body() credentials: CredentialsRequest,
  ): Promise<AccessTokenResponse> {
    return AccessTokenResponse.fromAccessToken(
      await this.loginUseCase.execute(credentials),
    );
  }
}
