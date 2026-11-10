import { Email } from '../value-objects/email.vo';

export class User {
  constructor(
    readonly id: string,
    readonly email: Email,
    readonly passwordHash: string,
    readonly createdAt: Date,
  ) {}
}
