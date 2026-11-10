---
name: project-conventions
description: Apply the URL Shortener API project's architecture, naming, implementation, validation, persistence, testing, and documentation conventions. Use when creating, modifying, reviewing, or refactoring project code.
---

# Project Conventions

Use this skill whenever you create, modify, review, or refactor code in this repository.

## 1. Project context

- Product: URL Shortener API.
- Runtime and language: Node.js LTS, TypeScript, pnpm.
- Framework: NestJS.
- Architecture: Modular Monolith with Clean Architecture boundaries.
- Persistence: PostgreSQL through Prisma.
- Authentication: JWT with Passport; passwords hashed with Argon2.
- Validation: use the project's established validation library and validate all external input.
- API documentation: Swagger / OpenAPI.
- Tests: Jest and Supertest.
- Local environment: Docker Compose.

Current business modules:
- `users`: registration, authentication, and user profile.
- `links`: short-link lifecycle and redirect resolution.
- `analytics`: click-event recording and basic analytics queries.

Do not introduce microservices, message brokers, Redis, event dispatchers, or other infrastructure unless a requirement clearly justifies it. Modules communicate through direct application-level interfaces.

## 2. Non-negotiable architecture rules

1. Keep the application as a modular monolith.
2. Keep business rules independent of NestJS, Prisma, PostgreSQL, and HTTP.
3. Dependencies point inward:

   `Interfaces -> Application -> Domain`

   `Infrastructure -> Application/Domain contracts`

4. Domain must not import NestJS, Prisma Client, HTTP request/response types, or infrastructure implementations.
5. Application use cases coordinate business operations; controllers must not contain business logic.
6. Infrastructure implements repository and external-service contracts.
7. A module must not access another module's database tables through that module's Prisma implementation. Use the owning module's public application contract.
8. Prefer synchronous direct module calls. Do not add event-driven communication for the current scope.

## 3. Recommended module layout

Keep each module self-contained. Adapt filenames to the existing repository rather than creating duplicate structures.

```text
src/
  modules/
    users/
      domain/
        entities/
        value-objects/
        repositories/
      application/
        use-cases/
        contracts/
        dto/
      interfaces/
        http/
          controllers/
          requests/
          responses/
      infrastructure/
        persistence/
          prisma/
            repositories/
      users.module.ts

    links/
      domain/
        entities/
        value-objects/
        repositories/
      application/
        use-cases/
        contracts/
        dto/
      interfaces/
        http/
          controllers/
          requests/
          responses/
      infrastructure/
        persistence/
          prisma/
            repositories/
      links.module.ts

    analytics/
      domain/
      application/
      interfaces/
      infrastructure/
      analytics.module.ts

  shared/
    domain/
    application/
    infrastructure/
  config/
  main.ts
```

Do not create empty layers or folders just to match this diagram. Add a layer when it has a real responsibility.

## 4. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Classes | PascalCase | `CreateShortLinkUseCase` |
| Interfaces / contracts | PascalCase; descriptive role | `ShortLinkRepository` |
| Functions / variables | camelCase | `resolveShortCode` |
| Constants | UPPER_SNAKE_CASE for true constants | `DEFAULT_SHORT_CODE_LENGTH` |
| Files | kebab-case | `create-short-link.use-case.ts` |
| Nest modules | `<name>.module.ts` | `links.module.ts` |
| Controllers | `<name>.controller.ts` | `links.controller.ts` |
| Use cases | `<action>-<subject>.use-case.ts` | `create-short-link.use-case.ts` |
| Prisma models | PascalCase singular | `ShortLink` |
| Database columns | snake_case via Prisma `@map` where appropriate | `created_at` |
| API paths | plural nouns; kebab-case | `/api/v1/links` |

Avoid vague names such as `Manager`, `Helper`, `Processor`, `CommonService`, or `Data`; name the business responsibility.

## 5. Domain conventions

- Domain entities protect their own invariants.
- Use value objects for concepts with meaningful validation or equality, such as `ShortCode` or `DestinationUrl`, when this reduces duplicated rules.
- Do not put HTTP status codes or API response shapes in the domain.
- Do not expose Prisma model types as domain entities.
- Use explicit domain errors for expected business-rule failures.
- Keep entities framework-independent.

Example:

```ts
export class DestinationUrl {
  private constructor(private readonly value: string) {}

  static create(input: string): DestinationUrl {
    let parsed: URL;

    try {
      parsed = new URL(input);
    } catch {
      throw new InvalidDestinationUrlError();
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new InvalidDestinationUrlError();
    }

    return new DestinationUrl(parsed.toString());
  }

  toString(): string {
    return this.value;
  }
}
```

## 6. Application conventions

- One use case should represent one application action.
- Use cases depend on interfaces/contracts, not concrete Prisma repositories.
- Keep orchestration in use cases; keep business invariants in domain objects.
- Return explicit application results. Avoid leaking ORM records.
- Use dependency injection tokens for interface-based dependencies.
- Keep cross-module calls behind a small public application contract.

Example:

```ts
export interface ShortLinkReader {
  findActiveByCode(code: string): Promise<{
    id: string;
    destinationUrl: string;
  } | null>;
}

export const SHORT_LINK_READER = Symbol('SHORT_LINK_READER');
```

A use case in `analytics` may depend on an analytics repository and a `ShortLinkReader` contract if it needs to verify a link. It must not import `PrismaShortLinkRepository` from `links`.

## 7. HTTP / API conventions

- Version public endpoints under `/api/v1`.
- Use DTOs or request schemas at the HTTP boundary.
- Validate path, query, and body input.
- Controllers translate HTTP input into use-case input and translate results into HTTP responses.
- Keep a consistent error response format across endpoints.
- Do not return database entities directly.
- Use `302 Found` for temporary short-link redirects unless the product requirement explicitly calls for another redirect status.
- Document endpoint behavior, authentication, and error responses in Swagger.

Suggested routes:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/links
GET    /api/v1/links
GET    /api/v1/links/:id
PATCH  /api/v1/links/:id
DELETE /api/v1/links/:id
GET    /:shortCode
GET    /api/v1/links/:id/analytics
```

## 8. Persistence conventions

- PostgreSQL constraints are the final guard for uniqueness and referential integrity.
- Use Prisma only in infrastructure/persistence.
- Map Prisma records to domain/application types at the repository boundary.
- Use database transactions when one use case must persist multiple related changes atomically.
- Add indexes based on query patterns, not speculatively.
- For short-code generation, handle unique-constraint collisions with a bounded retry; never rely only on a pre-insert lookup.
- Store timestamps consistently; use timezone-aware database timestamps.
- Do not store raw IP addresses for click analytics unless explicitly required and privacy-reviewed.

## 9. Short-link business rules

- Destination URLs must use `http` or `https`.
- A custom alias must satisfy the defined format and length limits.
- Short codes must be unique; enforce this with a database unique constraint.
- Only the owner may manage a private short link.
- Inactive or expired links must not redirect.
- Redirect resolution should be a focused use case and should not load unrelated analytics history.
- Click tracking should not cause a valid redirect to fail if analytics recording is intentionally made best-effort. If strict tracking is required, document the reliability trade-off and implement it explicitly.
- Never trust `userId` supplied in a request body for ownership; derive the authenticated user identity from the verified authentication context.

## 10. Testing conventions

- Unit-test domain rules and use cases without a real database.
- Test repository implementations against a test database when practical.
- Use Supertest for HTTP integration tests.
- Cover success paths, validation failures, authorization failures, not-found cases, expired/inactive links, and duplicate short-code collisions.
- Name tests after observable behavior, not implementation details.
- Do not make tests depend on execution order or shared mutable state.

### Required format: Given / When / Then

Every behavior test case must be specified in Given / When / Then form.

```text
Scenario: Reject an invalid destination URL

Given the user is authenticated
When the user submits a short-link request with an invalid URL
Then the API returns a validation error
And no short link is created
```

Reference scenarios:

| Scenario | Expected behavior |
| --- | --- |
| Invalid URL | Return validation error |
| Unsupported protocol | Reject `javascript:` URL |
| Duplicate alias | Return conflict error |
| Expired short link | Do not redirect |
| Inactive short link | Do not redirect |
| Unauthorized update | Return authorization error |
| Valid URL | Create short link successfully |

In automated tests:

- The `it(...)` description must preserve the Given / When / Then behavior: `'Given <context>, when <action>, then <outcome>'`.
- Mark the test body with `// Given`, `// When`, `// Then` comments. Arrange / Act / Assert is fine inside the implementation, but the test case specification itself must use Given / When / Then.

```ts
describe('CreateShortLinkUseCase', () => {
  it(
    'Given an invalid URL, when the user submits the request, then the API returns a validation error',
    async () => {
      // Given
      // When
      // Then
    },
  );
});
```

## 11. Code quality

- Follow `.agents/skills/sun-code-standart/SKILL.md`: no magic strings or numbers, no single-letter or throwaway names, meaningful names, shared logic extracted to utils.

- Prefer explicit types; avoid `any`.
- Keep functions small and focused.
- Avoid premature abstractions and speculative extensibility.
- Do not add dependencies for functionality that is simple to implement safely with existing tools.
- Do not silently swallow errors.
- Avoid logging passwords, JWTs, authorization headers, or sensitive personal data.
- Follow existing formatting, lint, and import-order configuration.

## 12. Required workflow for an agent

Before coding:
1. Inspect the relevant module and nearby tests.
2. Read `AGENTS.md` and this skill.
3. Identify the owning module and the correct layer.
4. Check whether a suitable contract, use case, or shared utility already exists.

While coding:
1. Make the smallest complete change.
2. Add or update tests with the behavior.
3. Preserve module boundaries and existing conventions.
4. Do not add infrastructure or dependencies without a clear requirement.

Before finishing:
1. Run relevant tests, lint, type-check, and build commands available in `package.json`.
2. Review the diff for unrelated changes, leaked ORM types, cross-module infrastructure imports, and missing validation.
3. Update Swagger or project documentation when API behavior changes.
4. Report commands run and any checks that could not be run.

## 13. Completion checklist

- [ ] Correct module and layer
- [ ] No framework/ORM dependency in domain
- [ ] No controller business logic
- [ ] No cross-module infrastructure import
- [ ] External input validated
- [ ] Authorization and ownership enforced
- [ ] Database constraints support critical invariants
- [ ] Tests cover success and failure behavior, written as Given / When / Then
- [ ] API documentation updated when needed
- [ ] Relevant checks run and results reported
