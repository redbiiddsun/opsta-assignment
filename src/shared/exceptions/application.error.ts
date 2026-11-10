import { ApplicationErrorKind } from './enums/application-error-kind.enum';

// Framework-free base for business errors: modules throw subclasses,
// and the global filter is the only place that turns `kind` into HTTP.
export abstract class ApplicationError extends Error {
  abstract readonly kind: ApplicationErrorKind;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
