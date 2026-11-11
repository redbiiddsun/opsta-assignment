import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LINKS_API, LinksApi } from '../links/application/contracts/links-api';
import { LinksModule } from '../links/links.module';
import { GetLinkAnalyticsUseCase } from './application/use-cases/get-link-analytics.use-case';
import { RecordClickUseCase } from './application/use-cases/record-click.use-case';
import {
  CLICK_EVENT_REPOSITORY,
  ClickEventRepository,
} from './domain/repositories/click-event.repository';
import { PrismaClickEventRepository } from './infrastructure/persistence/prisma-click-event.repository';
import { LinkRedirectedListener } from './interfaces/events/link-redirected.listener';
import { LinkAnalyticsController } from './interfaces/http/controllers/link-analytics.controller';

@Module({
  // LinksModule only for its public LinksApi (ownership); never its repository.
  imports: [AuthModule, LinksModule],
  controllers: [LinkAnalyticsController],
  providers: [
    { provide: CLICK_EVENT_REPOSITORY, useClass: PrismaClickEventRepository },
    {
      provide: RecordClickUseCase,
      inject: [CLICK_EVENT_REPOSITORY],
      useFactory: (clickEventRepository: ClickEventRepository) =>
        new RecordClickUseCase(clickEventRepository),
    },
    {
      provide: GetLinkAnalyticsUseCase,
      inject: [LINKS_API, CLICK_EVENT_REPOSITORY],
      useFactory: (
        linksApi: LinksApi,
        clickEventRepository: ClickEventRepository,
      ) => new GetLinkAnalyticsUseCase(linksApi, clickEventRepository),
    },
    LinkRedirectedListener,
  ],
})
export class AnalyticsModule {}
