import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../shared/database/prisma-transaction-context';
import {
  ClickEvent as ClickEventRecord,
  Prisma,
} from '../../../../shared/database/generated/client';
import {
  PageRequest,
  toOffset,
} from '../../../../shared/pagination/page-request';
import { ClickEvent } from '../../domain/entities/click-event.entity';
import {
  ClickEventRepository,
  ClickSummary,
} from '../../domain/repositories/click-event.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';
// Duplicate event id (redelivery) or link deleted between redirect and insert.
const IGNORED_RECORD_ERRORS = new Set([
  UNIQUE_CONSTRAINT_VIOLATION,
  FOREIGN_KEY_VIOLATION,
]);

const toEntity = (record: ClickEventRecord): ClickEvent =>
  new ClickEvent(
    record.id,
    record.linkId,
    record.clickedAt,
    record.referrerOrigin,
    record.userAgent,
  );

@Injectable()
export class PrismaClickEventRepository implements ClickEventRepository {
  constructor(private readonly database: PrismaTransactionContext) {}

  async record(click: ClickEvent): Promise<void> {
    try {
      await this.database.db.clickEvent.create({
        data: {
          id: click.id,
          linkId: click.linkId,
          clickedAt: click.clickedAt,
          referrerOrigin: click.referrerOrigin,
          userAgent: click.userAgent,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        IGNORED_RECORD_ERRORS.has(error.code)
      ) {
        return;
      }
      throw error;
    }
  }

  async summarize(linkId: string): Promise<ClickSummary> {
    const { _count, _max } = await this.database.db.clickEvent.aggregate({
      where: { linkId },
      _count: { _all: true },
      _max: { clickedAt: true },
    });
    return { totalClicks: _count._all, lastClickedAt: _max.clickedAt };
  }

  async listByLink(
    linkId: string,
    pageRequest: PageRequest,
  ): Promise<ClickEvent[]> {
    const records = await this.database.db.clickEvent.findMany({
      where: { linkId },
      // id breaks clickedAt ties so pages never overlap.
      orderBy: [{ clickedAt: 'desc' }, { id: 'desc' }],
      skip: toOffset(pageRequest),
      take: pageRequest.limit,
    });
    return records.map(toEntity);
  }
}
