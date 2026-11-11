import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { validateEnvironment } from './shared/config/env.validation';
import { PrismaModule } from './shared/database/prisma.module';
import { AllExceptionsFilter } from './shared/exceptions/all-exceptions.filter';
import { AuthModule } from './modules/auth/auth.module';
import { LinksModule } from './modules/links/links.module';
import { EventsModule } from './shared/events/events.module';

const THROTTLE_TTL_MS = 60_000;
const THROTTLE_LIMIT_PER_TTL = 100;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    // ponytail: in-memory throttle storage is per process; use a shared store if the API runs as multiple instances.
    ThrottlerModule.forRoot([
      { ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT_PER_TTL },
    ]),
    PrismaModule,
    EventsModule,
    AuthModule,
    LinksModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
