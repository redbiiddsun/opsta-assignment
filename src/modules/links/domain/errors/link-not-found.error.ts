import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

// One error for unknown, foreign, inactive and expired links, so responses don't reveal which.
export class LinkNotFoundError extends ApplicationError {
  readonly kind = ApplicationErrorKind.NotFound;

  constructor() {
    super('Link not found');
  }
}
