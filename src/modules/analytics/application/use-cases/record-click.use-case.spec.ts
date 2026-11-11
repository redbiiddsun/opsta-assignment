import { ClickEvent } from '../../domain/entities/click-event.entity';
import { RecordClickUseCase } from './record-click.use-case';
import { createClickEventRepositoryMock, LINK_ID } from './testing/fakes';

describe('RecordClickUseCase', () => {
  it('Given redirect facts, when recording, then the normalized click is stored', async () => {
    // Given
    const clickEventRepository = createClickEventRepositoryMock();
    const occurredAt = new Date('2026-01-01T00:00:00Z');

    // When
    await new RecordClickUseCase(clickEventRepository).execute({
      eventId: 'event-id',
      linkId: LINK_ID,
      occurredAt,
      referrer: 'https://news.example/post?id=1',
      userAgent: 'jest',
    });

    // Then
    expect(clickEventRepository.record).toHaveBeenCalledWith(
      new ClickEvent(
        'event-id',
        LINK_ID,
        occurredAt,
        'https://news.example',
        'jest',
      ),
    );
  });
});
