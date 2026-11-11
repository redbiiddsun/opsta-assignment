import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaTransactionContext } from '../src/shared/database/prisma-transaction-context';
import { PrismaService } from '../src/shared/database/prisma.service';

const uniqueEmail = () => `tx-${randomUUID()}@example.com`;

describe('PrismaTransactionContext (real database)', () => {
  let moduleRef: TestingModule;
  let database: PrismaTransactionContext;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    await moduleRef.init();
    database = moduleRef.get(PrismaTransactionContext);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('Given work that fails after a write, when run in a transaction, then the write is rolled back', async () => {
    // Given
    const email = uniqueEmail();
    const failure = new Error('credential insert failed');

    // When
    const run = database.runInTransaction(async () => {
      await database.db.user.create({ data: { email } });
      throw failure;
    });

    // Then
    await expect(run).rejects.toBe(failure);
    await expect(
      prisma.user.findUnique({ where: { email } }),
    ).resolves.toBeNull();
  });

  it('Given a nested call, when the outer transaction fails, then writes from both levels are rolled back', async () => {
    // Given
    const outerEmail = uniqueEmail();
    const innerEmail = uniqueEmail();

    // When
    const run = database.runInTransaction(async () => {
      await database.db.user.create({ data: { email: outerEmail } });
      await database.runInTransaction(() =>
        database.db.user.create({ data: { email: innerEmail } }),
      );
      throw new Error('outer failed');
    });

    // Then
    await expect(run).rejects.toThrow('outer failed');
    const survivors = await prisma.user.count({
      where: { email: { in: [outerEmail, innerEmail] } },
    });
    expect(survivors).toBe(0);
  });
});
