# AGENTS.md

This document defines the engineering guidelines for AI coding agents
and contributors working on the URL Shortener Platform.

## 1. Project Overview

Build a small, production-minded URL Shortener API as a **Modular
Monolith** using **Clean Architecture**.

The project is intentionally backend-first. Prioritize clear boundaries,
business rules, testability, and understandable design decisions over
feature count or premature optimization.

### Core capabilities

- User registration and authentication
- Create, list, retrieve, update, and delete short links
- Generate unique short codes and support custom aliases
- Redirect short codes to their original URLs
- Support link activation/deactivation and expiration
- Record click events and expose basic link analytics

### Non-goals for the MVP

Do not add these unless explicitly requested:

- Microservices
- Kubernetes
- Redis caching
- RabbitMQ or Kafka
- QR code generation
- Custom domains
- Team or organization management
- Advanced geographic analytics

## 2. Technology Stack

Use the following stack unless an explicit project decision overrides
it:

---

Area Technology

---

Language TypeScript

Runtime Node.js LTS

Package manager npm

Backend framework NestJS

Architecture Modular Monolith + Clean
Architecture

Database PostgreSQL

ORM Prisma

Validation Class Validator

Authentication Self-verify with lib

Password hashing Argon2

Short-code generation Input own text or Nano ID

Events In-process event dispatcher for MVP

Testing Jest + Supertest

API documentation Swagger / OpenAPI

Containerization Docker + Docker Compose

CI GitHub Actions (optional)
-----------------------------------------------------------------------

Do not introduce an additional library when the existing stack already
provides the required capability.

## 3. Architecture Principles

### 3.1 Modular Monolith

Organize code by business capability. Each module owns its business
rules, application use cases, interfaces, and infrastructure adapters.

Initial modules:

- `users`: registration, authentication, and user identity
- `links`: link lifecycle, short-code generation, and redirects
- `analytics`: click-event recording and analytics queries

Keep modules in one deployable application and one codebase. Do not
split them into separate services for this assignment.

### 3.2 Clean Architecture

Use these layers inside each business module:

- **Domain**: entities, value objects, domain rules, and repository
  contracts
- **Application**: use cases, application DTOs, and orchestration
- **Interfaces**: HTTP controllers, request/response DTOs, and
  presentation mapping
- **Infrastructure**: Prisma repository implementations, external
  adapters, and technical services

Dependency direction:

```text
Interfaces -> Application -> Domain
Infrastructure -> Domain contracts
```

The Domain layer must not depend on NestJS, Prisma, PostgreSQL, HTTP, or
other infrastructure details.

The Application layer should depend on abstractions, not concrete
database implementations.

### 3.3 Module Boundaries

- A module must not import another module's Prisma repository or
  access its tables directly.
- Cross-module communication must use an exported application-level
  contract, a public module API, or a domain/application event.
- Keep module internals private. Export only what other modules
  genuinely need.
- Avoid circular dependencies. If two modules need each other,
  redesign the ownership or introduce a narrow shared contract.
- `shared/` is for genuinely cross-cutting technical concerns, not a
  place to put business logic.

### 3.4 Composable Enterprise Readiness

Design each business capability so it can be composed or replaced
through explicit contracts.

For this MVP: - Keep module contracts independent of Prisma models and
NestJS HTTP DTOs. - Use typed events for asynchronous-style
communication. - Keep event transport behind an abstraction so an
external broker could be introduced later. - Do not implement a broker
or distributed architecture unless requested.

## 4. Suggested Project Structure

Adapt to the existing repository if it already has a consistent
structure. Do not restructure the whole project without a clear reason.

```text
src/
├── modules/
│   ├── users/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   └── repositories/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   └── dto/
│   │   ├── interfaces/
│   │   │   └── http/
│   │   │       ├── controllers/
│   │   │       └── dto/
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   └── security/
│   │   └── users.module.ts
│   ├── links/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── repositories/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   └── dto/
│   │   ├── interfaces/
│   │   │   └── http/
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   └── generators/
│   │   └── links.module.ts
│   └── analytics/
│       ├── domain/
│       ├── application/
│       ├── interfaces/
│       ├── infrastructure/
│       └── analytics.module.ts
├── shared/
│   ├── database/
│   ├── events/
│   ├── exceptions/
│   └── config/
├── app.module.ts
└── main.ts

prisma/
├── schema.prisma
└── migrations/

test/
├── integration/
└── e2e/
```

Keep files small and cohesive. Do not create empty folders or
speculative abstractions that have no current use.

## 5. Domain and Business Rules

Implement and test these rules:

### Users

- Email addresses must be unique.
- Never store plaintext passwords.
- Hash passwords using Argon2.
- Never return password hashes in API responses.
- Authenticated users may only manage their own links.

### Links

- A short code must be unique.
- A custom alias must be validated and unique.
- Generate random short codes using Nano ID.
- Handle short-code collisions safely: rely on the database unique
  constraint and retry generation a bounded number of times.
- Only allow `http` and `https` destination URLs.
- Reject malformed URLs and unsupported protocols such as
  `javascript:`.
- A deactivated link must not redirect.
- An expired link must not redirect.
- A user may only read, update, or delete links they own.
- Use HTTP `302` for redirects in the MVP.
- Use a consistent not-found response for unknown, inactive, or
  expired codes where appropriate.

### Analytics

- Record a click event for each successful redirect attempt according
  to the chosen event-delivery design.
- Store only data needed for the MVP, such as link ID, timestamp,
  referrer, and user agent.
- Do not store full IP addresses or other unnecessary personal data.
- Analytics failures should not silently change link ownership or link
  lifecycle state.
- Document whether click recording is best-effort or guaranteed.

## 6. Database and Persistence

Use PostgreSQL as the source of truth.

Suggested entities:

- `User`
- `Link`
- `ClickEvent`

Persistence rules:

- Define repository interfaces in the owning module's Domain layer.
- Implement repository interfaces in Infrastructure using Prisma.
- Do not expose Prisma-generated types outside Infrastructure.
- Map Prisma records to Domain entities or application models at the
  persistence boundary.
- Use database constraints for uniqueness and referential integrity;
  do not rely only on application-level checks.
- Add indexes for frequently queried fields, especially
  `links.short_code` and `click_events(link_id, clicked_at)`.
- Use migrations for schema changes. Do not rely on `prisma db push`
  as the deployment migration strategy.
- Keep transactions explicit when multiple database writes must
  succeed or fail together.

## 7. Events and Analytics Communication

Use a typed, in-process event dispatcher for the MVP.

Expected flow:

```text
HTTP Redirect Request
        |
        v
Redirect Use Case
        |
        +----> Resolve and validate link
        |
        +----> Publish LinkRedirected event
                         |
                         v
                  Analytics handler
                         |
                         v
                  Persist ClickEvent
        |
        v
HTTP 302 response
```

Guidelines:

- Define event contracts independently of Prisma and HTTP request
  objects.
- Do not pass NestJS request/response objects through domain events.
- Do not make the Links module depend on Analytics persistence.
- Keep event handlers idempotent where practical.
- Document that in-memory events can be lost if the process crashes.
- If stronger delivery guarantees are required later, propose a
  Transactional Outbox and a durable message transport. Do not add
  them to the MVP by default.

## 8. API Conventions

Use versioned REST endpoints under `/api/v1`.

Suggested endpoints:

Method Endpoint Purpose

---

POST `/api/v1/auth/register` Register
POST `/api/v1/auth/login` Login
POST `/api/v1/links` Create link
GET `/api/v1/links` List current user's links
GET `/api/v1/links/:id` Get link
PATCH `/api/v1/links/:id` Update link
DELETE `/api/v1/links/:id` Delete link
GET `/api/v1/links/:id/analytics` Get link analytics
GET `/:shortCode` Redirect

API guidelines:

- Use DTOs or schemas to validate all external input.
- Do not use Domain entities as request or response DTOs.
- Return appropriate HTTP status codes.
- Use a consistent error response format.
- Do not leak stack traces, SQL errors, secrets, or internal
  implementation details.
- Protect private link-management and analytics endpoints with
  authentication.
- Document public and protected endpoints in Swagger.
- Apply pagination to list and analytics endpoints.

## 9. Security Requirements

- Validate and normalize incoming URLs.
- Allow only HTTP and HTTPS destination schemes.
- Use Argon2 for password hashing.
- Validate JWT signature, issuer/audience where configured, and
  expiration.
- Keep secrets in environment variables; never commit `.env`.
- Provide `.env.example` with placeholder values only.
- Apply rate limiting to authentication and short-link creation
  endpoints.
- Avoid user enumeration in authentication error messages.
- Ensure authorization is checked at the use-case or application
  boundary, not only in the UI/controller.
- Do not log passwords, tokens, or sensitive request headers.

## 10. Testing Standards

Write tests for behavior and business rules, not implementation details.

### Unit tests

Prioritize: - Short-code generation and collision handling - URL
protocol validation - Link expiration - Link activation/deactivation -
Ownership checks - Redirect decision logic - Analytics event handling

Unit tests should not require a running PostgreSQL instance. Mock
repository and event interfaces.

### Integration tests

Test Prisma repositories against a real test database where practical: -
Unique short-code constraint - User/link relationships - Click-event
persistence - Transaction behavior

### E2E tests

Use Supertest to verify: - Registration and login - Authenticated link
creation - Unauthorized access - Ownership enforcement - Successful
redirect - Unknown, inactive, and expired short codes - Analytics
endpoint behavior

Do not claim tests pass unless they have actually been run.

## 11. Docker and Local Development

The MVP Docker Compose setup should include:

- `app`: NestJS API
- `postgres`: PostgreSQL

Requirements:

- Provide a health check for PostgreSQL.
- Ensure the app waits for database readiness before running
  migrations or starting.
- Persist PostgreSQL data using a named volume.
- Do not bake secrets into the image.
- Provide clear commands for development, migration, seeding, testing,
  and production-like startup.
- Use a multi-stage Dockerfile where practical.
- Run the application as a non-root user in the production image where
  practical.

The README must document the exact commands needed to start the project
from a clean checkout.

## 12. Code Quality

- Enable TypeScript strict mode.
- Avoid `any`; use explicit types or `unknown` with narrowing.
- Prefer small, single-purpose use cases.
- Keep controllers thin: parse input, call a use case, map output.
- Keep business rules out of controllers and Prisma repositories.
- Use dependency injection through explicit tokens or provider
  bindings for abstractions.
- Avoid service classes that become unrelated collections of methods.
- Avoid generic base repositories unless they remove real duplication
  without hiding behavior.
- Use meaningful names and consistent formatting.
- Handle errors explicitly; do not swallow exceptions.
- Add comments to explain non-obvious decisions, not to restate code.

## 13. AI Agent Workflow

Before changing code:

1.  Inspect the repository structure, package scripts, and existing
    conventions.
2.  Read relevant modules and tests before proposing a change.
3.  Identify the owning module and correct architecture layer.
4.  Explain the intended change briefly when the task is non-trivial.
5.  Avoid unrelated refactors.

While implementing:

1.  Make the smallest complete change that satisfies the request.
2.  Preserve existing public API contracts unless explicitly asked to
    change them.
3.  Add or update tests for changed behavior.
4.  Update Prisma schema and migrations when persistence changes.
5.  Update Swagger and README when API behavior changes.
6.  Do not add dependencies without explaining why they are needed.
7.  Do not add Redis, a broker, microservices, or other infrastructure
    without explicit justification.

Before finishing:

1.  Run relevant formatting and lint commands if available.
2.  Run relevant unit, integration, or E2E tests.
3.  Run TypeScript build/type-check.
4.  Review the diff for unrelated changes, secrets, debug output, and
    generated artifacts.
5.  Report exactly what changed, what commands were run, and any tests
    that were not run.

If a command cannot be run, state that clearly. Never fabricate
successful build or test results.

## 14. Definition of Done

A feature is complete when:

- Its business rules are implemented in the appropriate layer.
- Module boundaries and dependency direction are preserved.
- Input validation and authorization are handled.
- Relevant tests are added and pass.
- API documentation is updated when needed.
- Database migrations are included when needed.
- No secrets or unnecessary personal data are introduced.
- The README remains accurate.
- The implementation can be explained, including trade-offs and
  limitations.

## 15. Required Project Documentation

Maintain a README containing:

- Project overview and scope
- Technology stack
- Architecture overview and diagram
- Module responsibilities and dependency rules
- Database schema / ER diagram
- API documentation link
- Environment variables
- Local setup instructions
- Docker Compose instructions
- Migration and seed instructions
- Test commands
- AI-assisted development log, including tools used, representative
  prompts, and how generated output was reviewed
- Design decisions, trade-offs, and known limitations

The goal is not to maximize abstraction or infrastructure. The goal is a
small, reliable, testable system whose architecture is intentional and
whose design decisions can be clearly defended in a technical interview.
