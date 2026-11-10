import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

export class InvalidEmailError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Validation;

  constructor() {
    super('Email address is invalid');
  }
}
