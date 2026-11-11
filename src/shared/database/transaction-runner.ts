export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

// Lets a use case make writes in several modules atomic without seeing the ORM.
export interface TransactionRunner {
  /** Repositories that read `PrismaTransactionContext.db` inside `work` join the transaction. */
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
