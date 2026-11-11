import { Email } from '../value-objects/email.vo';

// Identity only: the password hash is a credential and lives in the auth module.
export class User {
  constructor(
    readonly id: string,
    readonly email: Email,
    readonly createdAt: Date,
  ) {}
}
