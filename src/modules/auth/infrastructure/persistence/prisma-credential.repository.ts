import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../shared/database/prisma-transaction-context';
import { CredentialRepository } from '../../domain/repositories/credential.repository';

// `db` joins the caller's transaction when there is one (register).
@Injectable()
export class PrismaCredentialRepository implements CredentialRepository {
  constructor(private readonly database: PrismaTransactionContext) {}

  async create(userId: string, passwordHash: string): Promise<void> {
    await this.database.db.credential.create({
      data: { userId, passwordHash },
    });
  }

  async findPasswordHash(userId: string): Promise<string | null> {
    const record = await this.database.db.credential.findUnique({
      where: { userId },
      select: { passwordHash: true },
    });
    return record?.passwordHash ?? null;
  }
}
