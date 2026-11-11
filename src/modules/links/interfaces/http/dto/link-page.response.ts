import { ApiProperty } from '@nestjs/swagger';
import { LinkPage } from '../../../application/models/link-page';
import { LinkResponse } from './link.response';

export class LinkPageResponse {
  @ApiProperty({ type: [LinkResponse] })
  items!: LinkResponse[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  static fromLinkPage(
    { items, page, limit, total }: LinkPage,
    publicBaseUrl: string,
  ): LinkPageResponse {
    return {
      items: items.map((link) => LinkResponse.fromLink(link, publicBaseUrl)),
      page,
      limit,
      total,
    };
  }
}
