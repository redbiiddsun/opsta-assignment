# Users & Authentication — Implementation Plan

Status: planned (not yet implemented). Owner module: `users`.

The `users` module is the first business module. `links` and `analytics`
depend on the authentication guard it exports, so it is built first.

**Prerequisite:** [1-setup-infrastructure.md](1-setup-infrastructure.md) —
PostgreSQL, Prisma, Docker, env config, error filter, validation pipe, Swagger.

## Decisions on conflicting guidance

`AGENTS.md` takes precedence over `.agents/skills/project-conventions`:

| Topic | Conventions skill | Decision | Reason |
|-------|-------------------|----------|--------|
| JWT | Passport | **`@nestjs/jwt` + own guard** | AGENTS.md: "Self-verify with lib"; one guard doesn't need Passport's strategy layer |

## 1. Scope

In scope:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- JWT access token
- `JwtAuthGuard` and `@CurrentUser()` exported for `links` / `analytics`

Out of scope (known limitations): refresh tokens, logout/revocation, email
verification, password reset, `/me`, roles.

## 2. New dependencies

| Package | Why |
|---------|-----|
| `@nestjs/jwt` | Sign / verify JWT |
| `argon2` | Password hashing (required) |

Uses `JWT_*` variables defined in setup-infrastructure §4.

## 3. Persistence

```prisma
model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique            // stored normalized (trim + lowercase)
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

- Migration: `npx prisma migrate dev --name init_users`.
- Email uniqueness is enforced by the DB constraint. There is no
  "check-then-insert" in the application — that races. Prisma error `P2002`
  is mapped to a domain error in the repository.

## 4. Module layout (`src/modules/users/`)

```text
domain/
  entities/user.entity.ts             User { id, email: Email, passwordHash, createdAt }
  value-objects/email.vo.ts           trim + lowercase + format check
  repositories/user.repository.ts     UserRepository + USER_REPOSITORY token
  errors/
    email-already-registered.error.ts (kind: conflict)
    invalid-credentials.error.ts      (kind: unauthorized)
application/
  contracts/password-hasher.ts        PasswordHasher { hash, verify } + token
  contracts/token-issuer.ts           TokenIssuer { issue(userId) } + token
  use-cases/register-user.use-case.ts
  use-cases/login.use-case.ts
infrastructure/
  persistence/prisma-user.repository.ts   P2002 → EmailAlreadyRegisteredError; record → entity
  security/argon2-password-hasher.ts      argon2id, library defaults
  security/jwt-token-issuer.ts            signAsync({ sub }, { issuer, audience, expiresIn })
interfaces/http/
  controllers/auth.controller.ts          thin: DTO → use case → response DTO
  dto/register.request.ts
  dto/login.request.ts
  dto/user.response.ts
  dto/access-token.response.ts
  guards/jwt-auth.guard.ts                public API for other modules
  decorators/current-user.decorator.ts    public API for other modules
users.module.ts                           binds tokens → implementations; exports guard + JwtModule
```

Contracts:

```ts
export interface UserRepository {
  create(email: Email, passwordHash: string): Promise<User>; // throws EmailAlreadyRegisteredError
  findByEmail(email: Email): Promise<User | null>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

export interface TokenIssuer {
  issue(userId: string): Promise<{ accessToken: string; expiresIn: string }>;
}
```

Why `PasswordHasher` and `TokenIssuer` are abstractions: they keep the use
cases free of Argon2 and JWT, and unit tests can use fakes (AGENTS.md §3.2,
§10). Use cases are plain classes (no Nest decorators), wired with
`useFactory` in `users.module.ts`.

## 5. Request flow

```mermaid
sequenceDiagram
  participant C as Client
  participant Ctl as AuthController
  participant UC as LoginUseCase
  participant R as UserRepository
  participant H as PasswordHasher
  participant T as TokenIssuer

  C->>Ctl: POST /api/v1/auth/login {email, password}
  Ctl->>Ctl: ValidationPipe (DTO)
  Ctl->>UC: execute({email, password})
  UC->>R: findByEmail(Email)
  R-->>UC: User | null
  UC->>H: verify(user?.hash ?? DUMMY_HASH, password)
  alt user missing or mismatch
    UC-->>Ctl: throw InvalidCredentialsError
    Ctl-->>C: 401 {statusCode, error, message}
  else ok
    UC->>T: issue(user.id)
    T-->>UC: {accessToken, expiresIn}
    Ctl-->>C: 200 {accessToken, tokenType, expiresIn}
  end
```

## 6. Use-case behavior

### RegisterUser

1. `Email.create(input.email)` (normalize + validate)
2. `hasher.hash(password)`
3. `repo.create(email, hash)`

| Case | Result |
|------|--------|
| Success | **201** `{ id, email, createdAt }` — no hash, no token |
| Email taken | `EmailAlreadyRegisteredError` → **409** |
| Invalid body | **400** |

### Login

1. `repo.findByEmail(email)`
2. Always call `hasher.verify` — against a fixed dummy hash when the user
   doesn't exist, so response time doesn't reveal whether the email is
   registered.
3. On success, `tokenIssuer.issue(user.id)`.

| Case | Result |
|------|--------|
| Success | **200** `{ accessToken, tokenType: 'Bearer', expiresIn }` |
| Unknown email | **401** `"Invalid email or password"` |
| Wrong password | **401** `"Invalid email or password"` (identical) |

Accepted trade-off: 409 on register reveals that an email exists. Fixing this
needs email verification, which is out of MVP scope.

## 7. Input validation

| Field | Rules |
|-------|-------|
| `email` | `IsEmail`, `MaxLength(254)` |
| `password` | `IsString`, `MinLength(8)`, `MaxLength(128)` — the cap stops very long inputs being used to make hashing expensive |

Unknown fields → 400 (`forbidNonWhitelisted`).

## 8. JwtAuthGuard (consumed by links / analytics)

- Reads `Authorization: Bearer <token>`.
- `JwtService.verifyAsync(token, { secret, issuer, audience })`; expiry is
  checked by default.
- Success: sets `request.user = { id: payload.sub }`.
- Any failure (missing, malformed, bad signature, expired, wrong iss/aud):
  **401** with a generic message.
- `@CurrentUser('id')` reads the id in controllers. **Ownership checks live in
  the links use cases**, not in the guard.
- Stateless (no DB lookup). Limitation: a deleted user's token stays valid
  until it expires; the 15-minute TTL limits this.

## 9. Security checklist

- [ ] Argon2id hashing; plaintext never stored
- [ ] `passwordHash` never in a response DTO or a log
- [ ] Generic credential error + matched timing on login
- [ ] `@Throttle({ default: { limit: 5, ttl: 60_000 } })` on register and login
- [ ] Never log passwords, tokens, or the `Authorization` header
- [ ] JWT issuer, audience and expiry are all verified

## 10. Tests

**Unit** (no DB; fake repository / hasher / issuer):

- `Email` — normalization, invalid formats
- `RegisterUserUseCase` — hashes the password, maps duplicates to conflict,
  output has no hash
- `LoginUseCase` — unknown email and wrong password give the same error;
  verify still runs for an unknown email; token issued on success
- `JwtAuthGuard` — missing, malformed, expired, wrong-audience and valid tokens

**Integration** (real test Postgres):

- `PrismaUserRepository` — unique email constraint → `EmailAlreadyRegisteredError`;
  record ↔ entity mapping

**E2E** (Supertest):

- register 201 · duplicate 409 · invalid body 400
- login 200 with token · bad password 401 · unknown email 401 (same body)
- no `passwordHash` in any response
- throttle returns 429 after the limit

## 11. Implementation order

1. Complete [1-setup-infrastructure.md](1-setup-infrastructure.md) steps 1–5.
2. Add `User` model + `init_users` migration.
3. Domain → application (+ unit tests) → infrastructure → interfaces.
4. Integration + E2E tests; Swagger decorators; README auth section.
5. Review loop: tech-lead agent review → developer agent fixes.

## 12. Verification

```bash
npx prisma migrate dev
npm run lint && npm run build
npm test
npm run test:e2e
```

Manual check: open `/api/docs`, register, log in, then call a guarded route
with and without the token.
