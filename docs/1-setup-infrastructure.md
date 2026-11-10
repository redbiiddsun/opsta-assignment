# Setup & Infrastructure — Implementation Plan

Status: planned (not yet implemented).

This covers the platform pieces every module depends on: PostgreSQL, Prisma,
Docker, environment config, and the shared app wiring. It must land before
any business module (see [users-auth.md](users-auth.md)).

## 1. Dependencies

| Package | Why |
|---------|-----|
| `prisma` (dev), `@prisma/client` | ORM (stack) |
| `@nestjs/config` | Env loading + validation |
| `class-validator`, `class-transformer` | DTO validation (stack) |
| `@nestjs/swagger` | API docs (required) |
| `@nestjs/throttler` | Rate limiting (required on auth and link creation) |

Package manager is **npm** (repo has `package-lock.json`; AGENTS.md says npm,
overriding the conventions skill's pnpm).

## 2. TypeScript

Enable `strict: true` in `tsconfig.json` (AGENTS.md §12). It currently has
`noImplicitAny: false` and `strictBindCallApply: false`; remove those overrides.

## 3. PostgreSQL & Prisma

- `prisma/schema.prisma` — `postgresql` datasource from `DATABASE_URL`.
  Models are added by each owning module (e.g. `User` in users-auth).
- Migrations only: `prisma migrate dev` locally, `prisma migrate deploy` in
  containers. Never `prisma db push` as the deployment strategy.
- `src/shared/database/prisma.service.ts` — extends `PrismaClient`,
  `onModuleInit` → `$connect`.
- `src/shared/database/prisma.module.ts` — `@Global()`, exports `PrismaService`.
- Prisma types never leave a module's `infrastructure/` layer.

## 4. Environment config

`src/shared/config/env.validation.ts`, validated at boot via
`ConfigModule.forRoot({ validate })`. The app fails fast on invalid env.

| Variable | Rule | Used by |
|----------|------|---------|
| `PORT` | default `3000` | app |
| `DATABASE_URL` | required | Prisma |
| `JWT_SECRET` | required, ≥ 32 chars | users |
| `JWT_EXPIRES_IN` | default `15m` | users |
| `JWT_ISSUER` | required | users |
| `JWT_AUDIENCE` | required | users |

- `.env.example` — every variable above with placeholder values only.
- `.env` stays gitignored. No secrets in the image or compose file.

## 5. Shared app wiring

- `src/shared/exceptions/application.error.ts` — `ApplicationError` base with
  `kind: 'conflict' | 'unauthorized' | 'forbidden' | 'not_found' | 'validation'`.
  Modules throw subclasses and never import HTTP types.
- `src/shared/exceptions/http-exception.filter.ts` — global filter, maps `kind`
  → HTTP status. Error shape is always `{ statusCode, error, message }`.
  Unknown errors become a generic 500 — no stack traces, no SQL/Prisma messages.
- `src/main.ts`:
  - `setGlobalPrefix('api/v1')` (the redirect route `/:shortCode` is excluded
    when `links` lands)
  - global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
  - Swagger at `/api/docs` with a bearer auth scheme
- `src/app.module.ts` — imports `ConfigModule`, `PrismaModule`,
  `ThrottlerModule` (default limit; routes tighten with `@Throttle`).

## 6. Docker

### docker-compose.yml

| Service | Details |
|---------|---------|
| `postgres` | `postgres:17-alpine`; env from `.env`; healthcheck `pg_isready`; named volume `postgres_data` |
| `app` | built from `Dockerfile`; `depends_on: postgres: condition: service_healthy`; runs `prisma migrate deploy` then starts |

Phase 1 (with users-auth) ships `postgres` only, so migrations and tests can
run. `app` is added once the API is runnable end-to-end.

### Dockerfile (multi-stage)

1. `deps` — `npm ci`
2. `build` — `npx prisma generate && npm run build`
3. `runtime` — `node:lts-alpine`, production deps + `dist` + `prisma/`,
   runs as non-root `node` user. Entry: `npx prisma migrate deploy && node dist/main`.

## 7. Test database

- Integration and E2E tests use a separate database, e.g. `DATABASE_URL`
  pointing at `url_shortener_test` on the same compose Postgres.
- Run `prisma migrate deploy` against it before the test run; truncate tables
  between suites.

## 8. Commands (to document in README)

```bash
cp .env.example .env
docker compose up -d postgres      # start database
npx prisma migrate dev             # apply migrations (dev)
npm run start:dev                  # run API locally
npm test                           # unit tests
npm run test:e2e                   # e2e (needs postgres)
docker compose up --build          # production-like startup (once app service exists)
```

## 9. Implementation order

1. Install deps, enable strict TS.
2. Config + env validation + `.env.example`.
3. Prisma schema skeleton, `PrismaService`/`PrismaModule`.
4. Exceptions + filter, `main.ts` wiring, Swagger.
5. `docker-compose.yml` with `postgres`.
6. Later: `Dockerfile` + `app` service.
7. Review loop: tech-lead agent review → developer agent fixes.

## 10. Verification

```bash
docker compose up -d postgres && docker compose ps   # postgres is healthy
npx prisma migrate dev                                # connects and migrates
npm run lint && npm run build
npm run start:dev                                     # boots; /api/docs loads
```

Also: start without `DATABASE_URL` and confirm the app refuses to boot.
