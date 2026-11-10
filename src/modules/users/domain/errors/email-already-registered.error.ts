import { ApplicationError } from '../../../../shared/exceptions/application.error';
import { ApplicationErrorKind } from '../../../../shared/exceptions/enums/application-error-kind.enum';

export class EmailAlreadyRegisteredError extends ApplicationError {
  readonly kind = ApplicationErrorKind.Conflict;

  constructor() {
    super('Email is already registered');
  }
}
