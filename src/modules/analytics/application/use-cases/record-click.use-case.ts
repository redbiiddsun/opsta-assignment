import {
  ClickEvent,
  RedirectFacts,
} from '../../domain/entities/click-event.entity';
import { ClickEventRepository } from '../../domain/repositories/click-event.repository';

export class RecordClickUseCase {
  constructor(private readonly clickEventRepository: ClickEventRepository) {}

  async execute(redirectFacts: RedirectFacts): Promise<void> {
    await this.clickEventRepository.record(
      ClickEvent.fromRedirect(redirectFacts),
    );
  }
}
