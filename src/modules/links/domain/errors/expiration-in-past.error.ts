import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

export class ExpirationInPastError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Validation;

  constructor() {
    super('Expiration must be in the future');
  }
}
