import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from './generated/client';
import { PrismaService } from './prisma.service';
import { TransactionRunner } from './transaction-runner';

// Carries the active transaction client through the async call chain, so
// repositories in different modules share it without passing it around.
// A separate class, not part of PrismaService: PrismaClient is a Proxy, and a
// getter on it would see the bare target without the model delegates.
@Injectable()
export class PrismaTransactionContext implements TransactionRunner {
  private readonly transactionStore =
    new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  /** The current transaction's client inside `runInTransaction`, otherwise the root client. */
  get db(): Prisma.TransactionClient {
    return this.transactionStore.getStore() ?? this.prisma;
  }

  // A nested call joins the outer transaction instead of opening a second one.
  runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.transactionStore.getStore()) {
      return work();
    }
    return this.prisma.$transaction((transaction) =>
      this.transactionStore.run(transaction, work),
    );
  }
}
