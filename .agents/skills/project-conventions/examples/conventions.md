# Convention Examples

These examples demonstrate the conventions in `../SKILL.md`. They are illustrative; adapt imports and exact types to the repository.

## Example 1 — Use case

**File:** `src/modules/links/application/use-cases/create-short-link.use-case.ts`

```ts
export interface CreateShortLinkInput {
  ownerId: string;
  destinationUrl: string;
  customAlias?: string;
}

export interface CreateShortLinkResult {
  id: string;
  shortCode: string;
  destinationUrl: string;
  createdAt: Date;
}

export class CreateShortLinkUseCase {
  constructor(
    private readonly links: ShortLinkRepository,
    private readonly codeGenerator: ShortCodeGenerator,
  ) {}

  async execute(
    input: CreateShortLinkInput,
  ): Promise<CreateShortLinkResult> {
    const destination = DestinationUrl.create(input.destinationUrl);

    const shortCode = input.customAlias
      ? ShortCode.create(input.customAlias)
      : await this.generateAvailableCode();

    const link = ShortLink.create({
      ownerId: input.ownerId,
      shortCode,
      destinationUrl: destination,
    });

    const saved = await this.links.save(link);

    return {
      id: saved.id,
      shortCode: saved.shortCode.value,
      destinationUrl: saved.destinationUrl.toString(),
      createdAt: saved.createdAt,
    };
  }

  private async generateAvailableCode(): Promise<ShortCode> {
    // The repository's unique constraint remains the final collision guard.
    return ShortCode.create(this.codeGenerator.generate());
  }
}
```

Notes:
- The use case has no NestJS decorator and no Prisma import.
- It depends on a domain repository contract.
- Any collision retry should be implemented against the repository's unique-conflict result with a bounded retry policy.

## Example 2 — Repository contract and Prisma implementation

**Domain contract:**

```ts
export interface ShortLinkRepository {
  save(link: ShortLink): Promise<ShortLink>;
  findById(id: string): Promise<ShortLink | null>;
  findByShortCode(code: string): Promise<ShortLink | null>;
}
```

**Infrastructure implementation:**

```ts
@Injectable()
export class PrismaShortLinkRepository implements ShortLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByShortCode(code: string): Promise<ShortLink | null> {
    const record = await this.prisma.shortLink.findUnique({
      where: { shortCode: code },
    });

    if (!record) return null;

    return ShortLinkMapper.toDomain(record);
  }
}
```

Notes:
- Prisma is confined to infrastructure.
- `ShortLinkMapper` translates persistence records into domain objects.
- Do not return `Prisma.ShortLink` from the repository contract.

## Example 3 — Thin controller

**File:** `src/modules/links/interfaces/http/controllers/links.controller.ts`

```ts
@Controller('api/v1/links')
export class LinksController {
  constructor(
    private readonly createShortLink: CreateShortLinkUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser('id') ownerId: string,
    @Body() body: CreateShortLinkRequest,
  ): Promise<CreateShortLinkResponse> {
    return this.createShortLink.execute({
      ownerId,
      destinationUrl: body.destinationUrl,
      customAlias: body.customAlias,
    });
  }
}
```

Notes:
- The controller extracts authenticated identity and validated request data.
- It does not create Prisma records or implement URL validation/business rules.

## Example 4 — Direct communication between modules

Analytics may need to confirm that a short link exists. Define a small contract in the consuming module (or a deliberately shared application-contract location), then provide it through the Links module's public provider.

```ts
export interface ShortLinkLookup {
  findForAnalytics(shortLinkId: string): Promise<{
    id: string;
    ownerId: string;
  } | null>;
}

export const SHORT_LINK_LOOKUP = Symbol('SHORT_LINK_LOOKUP');
```

The Analytics use case depends on `ShortLinkLookup`, not on `PrismaShortLinkRepository` or `LinksService` implementation details.

This is a direct synchronous application-level call. Do not add an event bus or message broker for this interaction.

## Example 5 — Test a use case with fakes

```ts
describe('CreateShortLinkUseCase', () => {
  it('Given a valid destination URL, when the owner creates a link, then the link is persisted', async () => {
    // Given
    const savedLinks: ShortLink[] = [];

    const repository: ShortLinkRepository = {
      save: async (link) => {
        savedLinks.push(link);
        return link;
      },
      findById: async () => null,
      findByShortCode: async () => null,
    };

    const generator: ShortCodeGenerator = {
      generate: () => 'abc123',
    };

    const useCase = new CreateShortLinkUseCase(repository, generator);

    // When
    const result = await useCase.execute({
      ownerId: 'user-123',
      destinationUrl: 'https://example.com/docs',
    });

    // Then
    expect(result.shortCode).toBe('abc123');
    expect(savedLinks).toHaveLength(1);
  });
});
```

## Anti-patterns to avoid

```ts
// Avoid: controller contains business logic and persistence details.
@Post()
async create(@Body() body: any) {
  const row = await this.prisma.shortLink.create({ data: body });
  return row;
}

// Avoid: domain depends on infrastructure/framework.
import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

// Avoid: one module reaches into another module's database adapter.
import { PrismaShortLinkRepository } from '../../links/infrastructure/persistence/prisma/prisma-short-link.repository';
```
