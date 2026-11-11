import { Global, Module } from '@nestjs/common';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';
import { TRANSACTION_RUNNER } from './transaction-runner';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTransactionContext,
    { provide: TRANSACTION_RUNNER, useExisting: PrismaTransactionContext },
  ],
  exports: [PrismaService, PrismaTransactionContext, TRANSACTION_RUNNER],
})
export class PrismaModule {}
