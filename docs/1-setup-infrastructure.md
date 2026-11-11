# Setup & Infrastructure — Implementation Plan

Status: steps 1–5 implemented; step 6 (Dockerfile + `app` service) pending.

This covers the platform pieces every module depends on: PostgreSQL, Prisma,
Docker, environment config, and the shared app wiring. It must land before
any business module (see [2-users-auth.md](2-users-auth.md)).

## 1. Dependencies

| Package | Why |
|---------|-----|
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | ORM (stack). Prisma 7 needs a driver adapter; `pg` comes with it. `prisma` (CLI) is a runtime dependency: the container runs `prisma migrate deploy` and `postinstall` runs `prisma generate`, both of which must work after `npm ci --omit=dev` |
| `@nestjs/config` | Env loading + validation |
| `class-validator`, `class-transformer` | DTO validation (stack) |
| `@nestjs/swagger` | API docs (required) |
| `@nestjs/throttler` | Rate limiting (required on auth and link creation) |

Package manager is **npm** (repo has `package-lock.json`; AGENTS.md says npm,
overriding the conventions skill's pnpm).

Versions are pinned to the Nest 11 line (`@nestjs/config@4`, `@nestjs/swagger@11`);
the newest majors require Nest 12. Prisma is pinned to stable 7.10.1 (npm's
`latest` tag currently points at an 8.0 RC). npm's `allowScripts` approves
Prisma's install scripts; `@scarf/scarf` telemetry is denied.

## 2. TypeScript

`strict: true` in `tsconfig.json` (AGENTS.md §12); the scaffold's
`noImplicitAny: false` / `strictBindCallApply: false` overrides are removed.
`prisma.config.ts` is excluded from `tsconfig.build.json` so `dist/` keeps its layout.

## 3. PostgreSQL & Prisma

- `prisma/schema.prisma` — `prisma-client` generator (CJS, extensionless
  imports) writing to `src/shared/database/generated/` (gitignored, created by
  `postinstall`). Models are added by each owning module (e.g. `User` in users-auth).
- `prisma.config.ts` — Prisma 7 config; holds `DATABASE_URL` and loads `.env`
  with Node's `process.loadEnvFile()` (no dotenv dependency).
- Migrations only: `prisma migrate dev` locally, `prisma migrate deploy` in
  containers. Never `prisma db push` as the deployment strategy.
- `src/shared/database/prisma.service.ts` — extends `PrismaClient` with the
  `PrismaPg` adapter; `$connect` on init, `$disconnect` on shutdown.
- `src/shared/database/prisma.module.ts` — `@Global()`, exports `PrismaService`.
- Prisma types never leave a module's `infrastructure/` layer.

## 4. Environment config

`src/shared/config/env.validation.ts`, validated at boot via
`ConfigModule.forRoot({ validate })`. The app fails fast on invalid env.

| Variable | Rule | Used by |
|----------|------|---------|
| `PORT` | default `3000` | app |
| `DATABASE_URL` | required | Prisma |
| `JWT_SECRET` | required, ≥ 32 chars | auth |
| `JWT_EXPIRES_IN` | default `15m` | auth |
| `JWT_ISSUER` | required | auth |
| `JWT_AUDIENCE` | required | auth |
| `REFRESH_TOKEN_TTL_DAYS` | integer ≥ 1, default `7` | auth |
| `PUBLIC_BASE_URL` | http(s) URL, default `http://localhost:3000` | links (`shortUrl`) |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` / `_PORT` | compose only; not read by the app | docker-compose |

- `.env.example` — every variable above with placeholder values only.
- `.env` stays gitignored. No secrets in the image or compose file.

## 5. Shared app wiring

- `src/shared/exceptions/application.error.ts` — `ApplicationError` base with
  `kind: 'conflict' | 'unauthorized' | 'forbidden' | 'not_found' | 'validation'`.
  Modules throw subclasses and never import HTTP types.
- `src/shared/exceptions/all-exceptions.filter.ts` — global `@Catch()` filter, maps `kind`
  → HTTP status. Error shape is always `{ statusCode, error, message }`.
  Unknown errors become a generic 500 — no stack traces, no SQL/Prisma messages.
- `src/shared/http/configure-app.ts` — `configureApp(app)`, called by
  `main.ts` **and e2e tests** so tests hit the same routes as production:
  - Swagger setup only. There is **no global prefix**: each API controller
    uses `@Controller(\`${API_PREFIX}/...\`)` (`shared/http/api-prefix.ts`),
    so the public redirect `GET /:shortCode` can sit at the root. Nest's
    `setGlobalPrefix` `exclude` matches by path pattern, and excluding
    `:shortCode` also stripped the prefix from `GET /links`.
  - Swagger at `/api/docs` with a bearer auth scheme
- `src/app.module.ts` — imports `ConfigModule` (global, validated),
  `PrismaModule`, `ThrottlerModule` (100 req/min default; routes tighten with
  `@Throttle`). Global providers via DI tokens, so e2e gets them automatically:
  - `APP_PIPE` — `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
  - `APP_FILTER` — `AllExceptionsFilter`
  - `APP_GUARD` — `ThrottlerGuard` (in-memory, per process)

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

Prisma 7 loads its WASM query compiler with a dynamic `import()`, which Jest
only allows under `--experimental-vm-modules`; `test:e2e` sets it via `NODE_OPTIONS`.

## 8. Commands (to document in README)

```bash
cp .env.example .env
docker compose up -d postgres      # start database
npx prisma migrate dev             # apply migrations (dev)
npm run start:dev                  # run API locally
npm test                           # unit tests
npm run test:e2e                   # e2e (needs postgres + .env)
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
