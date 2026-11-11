import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

export class InvalidShortCodeError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Validation;

  constructor() {
    super('Alias must be 3-32 letters, digits, - or _ and not a reserved word');
  }
}
