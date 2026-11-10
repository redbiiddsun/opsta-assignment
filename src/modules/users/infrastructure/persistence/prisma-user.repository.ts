import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  Prisma,
  User as UserRecord,
} from '../../../../shared/database/generated/client';
import { User } from '../../domain/entities/user.entity';
import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';
import { UserRepository } from '../../domain/repositories/user.repository';
import { Email } from '../../domain/value-objects/email.vo';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const isUniqueConstraintViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

const toEntity = (record: UserRecord): User =>
  new User(
    record.id,
    Email.create(record.email),
    record.passwordHash,
    record.createdAt,
  );

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: Email, passwordHash: string): Promise<User> {
    try {
      const record = await this.prisma.user.create({
        data: { email: email.toString(), passwordHash },
      });
      return toEntity(record);
    } catch (error) {
      // email is the only unique column besides the generated id.
      if (isUniqueConstraintViolation(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.toString() },
    });
    return record ? toEntity(record) : null;
  }
}
