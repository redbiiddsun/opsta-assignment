import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

// One message for unknown email and wrong password, so login can't be used to enumerate users.
export class InvalidCredentialsError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Unauthorized;

  constructor() {
    super('Invalid email or password');
  }
}
