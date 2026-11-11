import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Redirect,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResolveRedirectUseCase } from '../../../application/use-cases/resolve-redirect.use-case';

interface RedirectTarget {
  url: string;
  statusCode: HttpStatus;
}

// Public, at the root: no API_PREFIX (see shared/http/api-prefix.ts).
@ApiTags('redirect')
@Controller()
export class RedirectController {
  constructor(
    private readonly resolveRedirectUseCase: ResolveRedirectUseCase,
  ) {}

  @Get(':shortCode')
  @Redirect()
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to the destination URL',
  })
  @ApiNotFoundResponse({ description: 'Unknown, inactive or expired code' })
  async redirect(
    @Param('shortCode') shortCode: string,
    @Headers('referer') referrer?: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<RedirectTarget> {
    const url = await this.resolveRedirectUseCase.execute({
      shortCode,
      referrer: referrer ?? null,
      userAgent: userAgent ?? null,
    });
    return { url, statusCode: HttpStatus.FOUND };
  }
}
