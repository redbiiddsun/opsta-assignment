import { EventPublisher } from '../../../../../shared/events/event-publisher';
import { Link } from '../../../domain/entities/link.entity';
import { LinkRepository } from '../../../domain/repositories/link.repository';
import { ShortCodeGenerator } from '../../contracts/short-code-generator';

export const OWNER_ID = 'owner-id';
export const OTHER_USER_ID = 'other-user-id';
export const ONE_HOUR_MS = 3_600_000;

export const createLink = ({
  isActive = true,
  expiresAt = null,
}: { isActive?: boolean; expiresAt?: Date | null } = {}): Link =>
  new Link(
    'link-id',
    OWNER_ID,
    'abc1234',
    'https://example.com/',
    isActive,
    expiresAt,
    new Date('2026-01-01T00:00:00Z'),
    new Date('2026-01-01T00:00:00Z'),
  );

export const createLinkRepositoryMock = (): jest.Mocked<LinkRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByShortCode: jest.fn(),
  listByOwner: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

export const createShortCodeGeneratorMock =
  (): jest.Mocked<ShortCodeGenerator> => ({ generate: jest.fn() });

export const createEventPublisherMock = (): jest.Mocked<EventPublisher> => ({
  publish: jest.fn(),
});
