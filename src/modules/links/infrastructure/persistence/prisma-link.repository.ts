import { Injectable } from '@nestjs/common';
import {
  PageRequest,
  toOffset,
} from '../../../../shared/pagination/page-request';
import { PrismaTransactionContext } from '../../../../shared/database/prisma-transaction-context';
import {
  Link as LinkRecord,
  Prisma,
} from '../../../../shared/database/generated/client';
import { Link } from '../../domain/entities/link.entity';
import { LinkNotFoundError } from '../../domain/errors/link-not-found.error';
import { ShortCodeTakenError } from '../../domain/errors/short-code-taken.error';
import {
  LinkChanges,
  LinkRepository,
  NewLink,
} from '../../domain/repositories/link.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

const hasPrismaErrorCode = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const toEntity = (record: LinkRecord): Link =>
  new Link(
    record.id,
    record.ownerId,
    record.shortCode,
    record.destinationUrl,
    record.isActive,
    record.expiresAt,
    record.createdAt,
    record.updatedAt,
  );

@Injectable()
export class PrismaLinkRepository implements LinkRepository {
  constructor(private readonly database: PrismaTransactionContext) {}

  async create(link: NewLink): Promise<Link> {
    try {
      return toEntity(await this.database.db.link.create({ data: link }));
    } catch (error) {
      // short_code is the only unique column besides the generated id.
      if (hasPrismaErrorCode(error, UNIQUE_CONSTRAINT_VIOLATION)) {
        throw new ShortCodeTakenError();
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Link | null> {
    const record = await this.database.db.link.findUnique({ where: { id } });
    return record ? toEntity(record) : null;
  }

  async findByShortCode(shortCode: string): Promise<Link | null> {
    const record = await this.database.db.link.findUnique({
      where: { shortCode },
    });
    return record ? toEntity(record) : null;
  }

  async listByOwner(
    ownerId: string,
    pageRequest: PageRequest,
  ): Promise<{ items: Link[]; total: number }> {
    const [records, total] = await Promise.all([
      this.database.db.link.findMany({
        where: { ownerId },
        // id breaks createdAt ties so pages never overlap.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: toOffset(pageRequest),
        take: pageRequest.limit,
      }),
      this.database.db.link.count({ where: { ownerId } }),
    ]);
    return { items: records.map(toEntity), total };
  }

  async update(id: string, changes: LinkChanges): Promise<Link> {
    try {
      return toEntity(
        await this.database.db.link.update({ where: { id }, data: changes }),
      );
    } catch (error) {
      // Deleted between the ownership check and this write.
      if (hasPrismaErrorCode(error, RECORD_NOT_FOUND)) {
        throw new LinkNotFoundError();
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { count } = await this.database.db.link.deleteMany({
      where: { id },
    });
    if (count === 0) {
      throw new LinkNotFoundError();
    }
  }
}
