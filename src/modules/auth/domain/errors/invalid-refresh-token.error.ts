import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

// One message for unknown, expired and revoked tokens, so the response reveals nothing about the token.
export class InvalidRefreshTokenError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Unauthorized;

  constructor() {
    super('Invalid refresh token');
  }
}
