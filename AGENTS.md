# AGENTS.md

Conventions for anyone, human or AI assistant, working in this repo. See `README.md` for setup.

## Commands

Run everything from the repo root.

- `pnpm api:dev` / `pnpm portal:dev`: start the apps
- `pnpm db:migrate`: create and apply a migration after editing `app/api/prisma/schema.prisma`, then `pnpm --filter api db:generate`
- `pnpm db:seed`: reload the test tenants and users (password `123456`)
- `pnpm --filter api test`: API unit tests
- `pnpm --filter api test:e2e`: API HTTP tests (supertest, Prisma mocked)
- `pnpm --filter portal test`: portal unit tests (Jest via `next/jest`)
- `pnpm --filter portal test:e2e`: portal end-to-end tests (Playwright + axe) against the running local stack
- `pnpm --filter api lint` and `pnpm --filter portal lint`

## Layout

- `app/api`: NestJS 12, Prisma 7 with PostgreSQL. ESM, so relative imports end in `.js`.
- `app/portal`: Next.js 16 App Router with `cacheComponents` enabled. Read `app/portal/AGENTS.md` before changing portal code.
- The Prisma client is generated into `app/api/src/generated/prisma`. Don't edit it.

## Tenant context

There is no API gateway, and the API never trusts a client-supplied tenant id (no `x-tenant-id` header). Tenant-scoped routes carry the tenant in the path (`/tenants/:tenantId/...`) and apply `@UseGuards(AuthGuard, TenantMemberGuard)` at the controller class, in that order. `TenantMemberGuard` (`app/api/src/tenancy/tenant-member.guard.ts`) validates the id as a UUID and looks up the membership in the database on every request, using only the verified JWT `sub` as the user id. A malformed id, an unknown tenant and a tenant the user doesn't belong to all get the same `404` body with `code: 'TENANT_NOT_FOUND'`. Handlers read the validated `{ tenantId, role }` with `@CurrentTenant()`.

## Authorization

Roles are read from the database, never from the access token. The token only carries `{ sub, username }`, so a demoted admin loses access on their next request instead of when the token expires. Mark admin-only handlers with `@RequireTenantRole(TenantRole.ADMIN)`; `TenantMemberGuard` answers `403` with `code: 'NOT_TENANT_ADMIN'` for members. Writes that depend on the actor's role re-read it inside the same transaction as the write.

## API handlers

- Keep controllers thin and put logic in services.
- Validate every payload on the server. Enumerated values use `@IsEnum` with the Prisma enum (for roles, `TenantRole`); the portal's form controls are not a security boundary. `configureApp` in `app/api/src/app.setup.ts` installs a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted` and `transform`, and turns failures into `400` with `code: 'VALIDATION_FAILED'`. Path ids use `ParseUUIDPipe`.
- There is no global exception filter. Services catch the Prisma errors they expect and map them to HTTP exceptions with a stable `code` (for example `P2025` to `404`), and never send Prisma messages to the client. Role changes run in a transaction that locks the tenant row, re-reads the actor's role and then updates by the composite key `tenantId_userId`.

## Testing

- Unit and HTTP tests run on Jest in both apps: the API with native ESM (`--experimental-vm-modules`) and `@swc/jest`, the portal through `next/jest`.
- Unit-test services with `createPrismaMock()` from `app/api/test/prisma-mock.ts`. The API HTTP tests (supertest) boot the real Nest app with `PrismaService` overridden by the same mock.
- Don't connect to the database in Jest tests. CI has no PostgreSQL.
- The Playwright suite (`app/portal/e2e`) is the exception: it needs the local API, portal and PostgreSQL, reseeds the database with `pnpm db:seed`, needs exclusive use of it while it runs, and is not part of CI.
- Test files sit next to the code they test as `*.spec.ts`; API HTTP tests live in `app/api/test/*.e2e-spec.ts` and Playwright tests in `app/portal/e2e/*.e2e.ts`.

## Portal data fetching

- Server-side data loading lives in `app/portal/src/lib`. Pages call those functions inside a `<Suspense>` boundary.
- Never wrap per-user API reads in `'use cache'` or pass the session token into a cached function: the token would become part of the cache key and the cached roles go stale after a role change. Fetch members with `cache: 'no-store'`.
- Mutations are Server Actions that call `apiFetch`.

## Style

- Match the surrounding code: Prettier defaults, single quotes in the API, double quotes in the portal.
- Generated shadcn components count as our code: after `shadcn add`, run Prettier on `app/portal/src/components/ui` (the portal's `.prettierrc` keeps semicolons).
- Do not add code comments. Names and tests carry the intent; design reasoning goes in SUBMISSION.md.
