import { Global, Module } from '@nestjs/common';
import { EVENT_PUBLISHER } from './event-publisher';
import { EVENT_SUBSCRIBER } from './event-subscriber';
import { InProcessEventBus } from './in-process-event-bus';

@Global()
@Module({
  providers: [
    InProcessEventBus,
    { provide: EVENT_PUBLISHER, useExisting: InProcessEventBus },
    { provide: EVENT_SUBSCRIBER, useExisting: InProcessEventBus },
  ],
  // Modules depend on the ports, never on the in-process bus itself.
  exports: [EVENT_PUBLISHER, EVENT_SUBSCRIBER],
})
export class EventsModule {}
