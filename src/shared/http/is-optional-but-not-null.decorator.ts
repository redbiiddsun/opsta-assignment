import { ValidateIf } from 'class-validator';

// IsOptional also skips null, which would let null reach the domain; this skips only an absent field.
export const IsOptionalButNotNull = () =>
  ValidateIf((_object: object, value: unknown) => value !== undefined);
