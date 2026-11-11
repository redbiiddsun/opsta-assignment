import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EnvironmentVariables } from '../../../../../shared/config/env.validation';
import { PaginationQuery } from '../../../../../shared/http/pagination.query';
import { CurrentUser } from '../../../../auth/interfaces/http/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/interfaces/http/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../../auth/interfaces/http/models/authenticated-user';
import { CreateLinkUseCase } from '../../../application/use-cases/create-link.use-case';
import { DeleteLinkUseCase } from '../../../application/use-cases/delete-link.use-case';
import { GetLinkUseCase } from '../../../application/use-cases/get-link.use-case';
import { ListLinksUseCase } from '../../../application/use-cases/list-links.use-case';
import { UpdateLinkUseCase } from '../../../application/use-cases/update-link.use-case';
import { CreateLinkRequest } from '../dto/create-link.request';
import { LinkPageResponse } from '../dto/link-page.response';
import { LinkResponse } from '../dto/link.response';
import { UpdateLinkRequest } from '../dto/update-link.request';
import { API_PREFIX } from '../../../../../shared/http/api-prefix';

const CREATE_LINK_THROTTLE = { default: { limit: 30, ttl: 60_000 } };
const LINK_NOT_FOUND = 'Link not found or not owned by the current user';

@ApiTags('links')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller(`${API_PREFIX}/links`)
export class LinksController {
  private readonly publicBaseUrl: string;

  constructor(
    private readonly createLinkUseCase: CreateLinkUseCase,
    private readonly listLinksUseCase: ListLinksUseCase,
    private readonly getLinkUseCase: GetLinkUseCase,
    private readonly updateLinkUseCase: UpdateLinkUseCase,
    private readonly deleteLinkUseCase: DeleteLinkUseCase,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.publicBaseUrl = configService.get('PUBLIC_BASE_URL', { infer: true });
  }

  @Post()
  @Throttle(CREATE_LINK_THROTTLE)
  @ApiCreatedResponse({ type: LinkResponse })
  @ApiBadRequestResponse({
    description: 'Invalid URL, protocol, alias or expiry',
  })
  @ApiConflictResponse({ description: 'Alias is already taken' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateLinkRequest,
  ): Promise<LinkResponse> {
    const link = await this.createLinkUseCase.execute({
      ownerId: user.id,
      ...request,
    });
    return LinkResponse.fromLink(link, this.publicBaseUrl);
  }

  @Get()
  @ApiOkResponse({ type: LinkPageResponse })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() { page, limit }: PaginationQuery,
  ): Promise<LinkPageResponse> {
    const linkPage = await this.listLinksUseCase.execute({
      ownerId: user.id,
      page,
      limit,
    });
    return LinkPageResponse.fromLinkPage(linkPage, this.publicBaseUrl);
  }

  @Get(':id')
  @ApiOkResponse({ type: LinkResponse })
  @ApiNotFoundResponse({ description: LINK_NOT_FOUND })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) linkId: string,
  ): Promise<LinkResponse> {
    const link = await this.getLinkUseCase.execute({
      linkId,
      userId: user.id,
    });
    return LinkResponse.fromLink(link, this.publicBaseUrl);
  }

  @Patch(':id')
  @ApiOkResponse({ type: LinkResponse })
  @ApiBadRequestResponse({ description: 'Invalid URL or expiry' })
  @ApiNotFoundResponse({ description: LINK_NOT_FOUND })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) linkId: string,
    @Body() request: UpdateLinkRequest,
  ): Promise<LinkResponse> {
    const link = await this.updateLinkUseCase.execute({
      linkId,
      userId: user.id,
      ...request,
    });
    return LinkResponse.fromLink(link, this.publicBaseUrl);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Link deleted' })
  @ApiNotFoundResponse({ description: LINK_NOT_FOUND })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    await this.deleteLinkUseCase.execute({ linkId, userId: user.id });
  }
}
