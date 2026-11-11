import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

export class ShortCodeTakenError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Conflict;

  constructor() {
    super('Short code is already taken');
  }
}
