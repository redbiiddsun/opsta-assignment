import { InvalidEmailError } from '../errors/invalid-email.error';

const MAX_EMAIL_LENGTH = 254;
// Shape check only; the HTTP DTO applies the full IsEmail rule at the boundary.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static create(rawEmail: string): Email {
    const normalizedEmail = rawEmail.trim().toLowerCase();
    if (
      normalizedEmail.length > MAX_EMAIL_LENGTH ||
      !EMAIL_SHAPE.test(normalizedEmail)
    ) {
      throw new InvalidEmailError();
    }
    return new Email(normalizedEmail);
  }

  toString(): string {
    return this.value;
  }
}
