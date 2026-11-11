import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { API_PREFIX } from '../../../../../shared/http/api-prefix';
import { PaginationQuery } from '../../../../../shared/http/pagination.query';
import { CurrentUser } from '../../../../auth/interfaces/http/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/interfaces/http/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../../auth/interfaces/http/models/authenticated-user';
import { GetLinkAnalyticsUseCase } from '../../../application/use-cases/get-link-analytics.use-case';
import { LinkAnalyticsResponse } from '../dto/link-analytics.response';

@ApiTags('analytics')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller(`${API_PREFIX}/links`)
export class LinkAnalyticsController {
  constructor(
    private readonly getLinkAnalyticsUseCase: GetLinkAnalyticsUseCase,
  ) {}

  @Get(':id/analytics')
  @ApiOkResponse({
    type: LinkAnalyticsResponse,
    description: 'Clicks are recorded best-effort, shortly after the redirect',
  })
  @ApiBadRequestResponse({ description: 'Invalid link id or page params' })
  @ApiNotFoundResponse({
    description: 'Link not found or not owned by the current user',
  })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) linkId: string,
    @Query() { page, limit }: PaginationQuery,
  ): Promise<LinkAnalyticsResponse> {
    return LinkAnalyticsResponse.fromLinkAnalytics(
      await this.getLinkAnalyticsUseCase.execute({
        linkId,
        userId: user.id,
        page,
        limit,
      }),
    );
  }
}
