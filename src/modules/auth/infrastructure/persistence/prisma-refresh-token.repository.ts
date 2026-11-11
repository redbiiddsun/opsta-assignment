import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RefreshToken as RefreshTokenRecord } from '../../../../shared/database/generated/client';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import {
  NewRefreshToken,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';

const toEntity = (record: RefreshTokenRecord): RefreshToken =>
  new RefreshToken(
    record.id,
    record.userId,
    record.expiresAt,
    record.revokedAt,
  );

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(refreshToken: NewRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({ data: refreshToken });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    return record ? toEntity(record) : null;
  }

  async rotate(currentId: string, next: NewRefreshToken): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      // The `revokedAt: null` filter makes this the race guard: a concurrent
      // rotation of the same row waits on the row lock, then matches nothing.
      const { count } = await transaction.refreshToken.updateMany({
        where: { id: currentId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (count === 0) {
        return false;
      }
      await transaction.refreshToken.create({ data: next });
      return true;
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
