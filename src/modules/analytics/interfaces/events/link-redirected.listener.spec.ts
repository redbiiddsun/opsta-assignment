import { InProcessEventBus } from '../../../../shared/events/in-process-event-bus';
import { LinkRedirectedEvent } from '../../../links/application/events/link-redirected.event';
import { RecordClickUseCase } from '../../application/use-cases/record-click.use-case';
import { createClickEventRepositoryMock } from '../../application/use-cases/testing/fakes';
import { ClickEvent } from '../../domain/entities/click-event.entity';
import { LinkRedirectedListener } from './link-redirected.listener';

describe('LinkRedirectedListener', () => {
  it('Given the listener is initialized, when a LinkRedirectedEvent is published, then a click is recorded from it', async () => {
    // Given
    const eventBus = new InProcessEventBus();
    const clickEventRepository = createClickEventRepositoryMock();
    new LinkRedirectedListener(
      eventBus,
      new RecordClickUseCase(clickEventRepository),
    ).onModuleInit();
    const event = new LinkRedirectedEvent(
      'link-id',
      new Date('2026-01-01T00:00:00Z'),
      'https://news.example/post',
      'jest',
    );

    // When
    eventBus.publish(event);
    await eventBus.beforeApplicationShutdown();

    // Then
    expect(clickEventRepository.record).toHaveBeenCalledWith(
      new ClickEvent(
        event.eventId,
        'link-id',
        event.occurredAt,
        'https://news.example',
        'jest',
      ),
    );
  });
});
