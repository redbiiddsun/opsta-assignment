import { Global, Module } from '@nestjs/common';
import { EVENT_PUBLISHER } from './event-publisher';
import { InProcessEventBus } from './in-process-event-bus';

@Global()
@Module({
  providers: [
    InProcessEventBus,
    { provide: EVENT_PUBLISHER, useExisting: InProcessEventBus },
  ],
  // The bus itself is exported for subscribers; publishers depend on EVENT_PUBLISHER.
  exports: [InProcessEventBus, EVENT_PUBLISHER],
})
export class EventsModule {}
