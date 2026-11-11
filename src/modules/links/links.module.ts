import { Module } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  EventPublisher,
} from '../../shared/events/event-publisher';
import { AuthModule } from '../auth/auth.module';
import {
  SHORT_CODE_GENERATOR,
  ShortCodeGenerator,
} from './application/contracts/short-code-generator';
import { CreateLinkUseCase } from './application/use-cases/create-link.use-case';
import { DeleteLinkUseCase } from './application/use-cases/delete-link.use-case';
import { GetLinkUseCase } from './application/use-cases/get-link.use-case';
import { ListLinksUseCase } from './application/use-cases/list-links.use-case';
import { ResolveRedirectUseCase } from './application/use-cases/resolve-redirect.use-case';
import { UpdateLinkUseCase } from './application/use-cases/update-link.use-case';
import {
  LINK_REPOSITORY,
  LinkRepository,
} from './domain/repositories/link.repository';
import { NanoidShortCodeGenerator } from './infrastructure/generators/nanoid-short-code-generator';
import { PrismaLinkRepository } from './infrastructure/persistence/prisma-link.repository';
import { LinksController } from './interfaces/http/controllers/links.controller';
import { RedirectController } from './interfaces/http/controllers/redirect.controller';

@Module({
  imports: [AuthModule],
  controllers: [LinksController, RedirectController],
  providers: [
    { provide: LINK_REPOSITORY, useClass: PrismaLinkRepository },
    { provide: SHORT_CODE_GENERATOR, useClass: NanoidShortCodeGenerator },
    {
      provide: CreateLinkUseCase,
      inject: [LINK_REPOSITORY, SHORT_CODE_GENERATOR],
      useFactory: (
        linkRepository: LinkRepository,
        shortCodeGenerator: ShortCodeGenerator,
      ) => new CreateLinkUseCase(linkRepository, shortCodeGenerator),
    },
    {
      provide: ListLinksUseCase,
      inject: [LINK_REPOSITORY],
      useFactory: (linkRepository: LinkRepository) =>
        new ListLinksUseCase(linkRepository),
    },
    {
      provide: GetLinkUseCase,
      inject: [LINK_REPOSITORY],
      useFactory: (linkRepository: LinkRepository) =>
        new GetLinkUseCase(linkRepository),
    },
    {
      provide: UpdateLinkUseCase,
      inject: [LINK_REPOSITORY, GetLinkUseCase],
      useFactory: (
        linkRepository: LinkRepository,
        getLinkUseCase: GetLinkUseCase,
      ) => new UpdateLinkUseCase(linkRepository, getLinkUseCase),
    },
    {
      provide: DeleteLinkUseCase,
      inject: [LINK_REPOSITORY, GetLinkUseCase],
      useFactory: (
        linkRepository: LinkRepository,
        getLinkUseCase: GetLinkUseCase,
      ) => new DeleteLinkUseCase(linkRepository, getLinkUseCase),
    },
    {
      provide: ResolveRedirectUseCase,
      inject: [LINK_REPOSITORY, EVENT_PUBLISHER],
      useFactory: (
        linkRepository: LinkRepository,
        eventPublisher: EventPublisher,
      ) => new ResolveRedirectUseCase(linkRepository, eventPublisher),
    },
  ],
  // Public API for analytics: ownership-checked link lookup.
  exports: [GetLinkUseCase],
})
export class LinksModule {}
