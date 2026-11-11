import { Module } from '@nestjs/common';
import { USERS_API } from './application/contracts/users-api';
import { UsersApiService } from './application/services/users-api.service';
import {
  USER_REPOSITORY,
  UserRepository,
} from './domain/repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';

@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: USERS_API,
      inject: [USER_REPOSITORY],
      useFactory: (userRepository: UserRepository) =>
        new UsersApiService(userRepository),
    },
  ],
  exports: [USERS_API],
})
export class UsersModule {}
