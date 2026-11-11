import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

export class InvalidDestinationUrlError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Validation;

  constructor() {
    super('Destination URL must be a valid http or https URL');
  }
}
