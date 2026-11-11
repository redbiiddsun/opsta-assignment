import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../models/authenticated-request';
import { AuthenticatedUser } from '../models/authenticated-user';

// Use on routes behind JwtAuthGuard, which sets request.user.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
