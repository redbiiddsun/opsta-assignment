import { ClickEvent } from '../../../domain/entities/click-event.entity';
import { ClickEventRepository } from '../../../domain/repositories/click-event.repository';
import { LinkOwnershipCheck } from '../get-link-analytics.use-case';

export const LINK_ID = 'link-id';
export const USER_ID = 'user-id';

export const createClickEvent = (): ClickEvent =>
  new ClickEvent(
    'event-id',
    LINK_ID,
    new Date('2026-01-01T00:00:00Z'),
    'https://news.example',
    'jest',
  );

export const createClickEventRepositoryMock =
  (): jest.Mocked<ClickEventRepository> => ({
    record: jest.fn(),
    summarize: jest.fn(),
    listByLink: jest.fn(),
  });

export const createLinkOwnershipCheckMock =
  (): jest.Mocked<LinkOwnershipCheck> => ({ execute: jest.fn() });
