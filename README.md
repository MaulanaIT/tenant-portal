# Tenant Portal

A multi-tenant portal. Users sign in with a username and password and switch between the tenants they belong to. A user can be an **Admin** or a **Member** of each tenant.

| App | Stack | Path | Local URL |
|---|---|---|---|
| API | NestJS 12, Prisma 7, PostgreSQL | `app/api` | http://localhost:3000 |
| Portal | Next.js 16 (App Router), Tailwind CSS 4 | `app/portal` | http://localhost:3001 |

Both apps live in one pnpm workspace and share a single `.env` at the repo root.

> **Doing the assessment?** Start with [TASKS.md](TASKS.md). It explains how to fork this repo, what to build and how to submit.

Assessment submission notes: see [SUBMISSION.md](SUBMISSION.md) (includes ["Where I disagreed with the repo or my AI"](SUBMISSION.md#where-i-disagreed-with-the-repo-or-my-ai)).

**Live URLs:** portal https://tenant-portal-navy.vercel.app · API https://tenant-portal-api-two.vercel.app (both on Vercel, PostgreSQL on Neon; see [SUBMISSION.md](SUBMISSION.md)). Sign in as `alice` / `123456`.

## Prerequisites

- Node.js 20.19 or newer
- pnpm 11 (`corepack enable` picks up the version in `package.json`)
- Docker, for the local PostgreSQL database (or Prisma's local server, see [Without Docker](#without-docker-prisma-dev))

## Run it locally

```bash
# 1. Install dependencies (this also generates the Prisma client)
pnpm install

# 2. Create your env file
cp .env.example .env

# 3. Start PostgreSQL on localhost:5433
pnpm db:up

# 4. Create the tables and load the sample users
pnpm db:migrate
pnpm db:seed

# 5. Start both apps, each in its own terminal
pnpm api:dev
pnpm portal:dev
```

Open http://localhost:3001 and sign in with one of the test accounts below.

### Without Docker (`prisma dev`)

Docker Compose above stays the default. If Docker isn't available, Prisma 7's built-in local PostgreSQL server works too:

```bash
# Start a named local server in the background
pnpm --filter api exec prisma dev --name tenant-portal --detach

# Print its connection strings
pnpm --filter api exec prisma dev ls
```

Copy the **TCP** URL (`postgres://postgres:postgres@localhost:<port>/template1?sslmode=disable`) into `DATABASE_URL` in `.env`. The API uses the `pg` driver adapter, so the `prisma+postgres://` URL doesn't work here. Then run steps 4 and 5 above (`pnpm db:migrate`, `pnpm db:seed`, start both apps). `pnpm db:up` and `pnpm db:down` aren't needed; stop the server with `pnpm --filter api exec prisma dev stop tenant-portal` and start it again later with `pnpm --filter api exec prisma dev start tenant-portal`.

## Test accounts

Every seeded user has the password **`123456`**. Sign in with the username, not the email.

| Username | Tenants (role) | Account status |
|---|---|---|
| `alice` | Acme Corporation (Admin), Globex Industries (Admin) | Active |
| `bob` | Initech (Admin), Acme Corporation (Member) | Active |
| `carol` | Globex Industries (Member), Initech (Member) | Active |
| `dave` | Umbrella Holdings (Admin) | Active |
| `erin` | Stark Enterprises (Admin) | Active |
| `frank` | Wayne Logistics (Admin) | Active |
| `grace` | Hooli (Admin) | Active |
| `heidi` | Umbrella Holdings (Member) | Invited |
| `ivan` | Stark Enterprises (Member) | Suspended |
| `judy` | Hooli (Member) | Active |

Account status is display-only for now: invited and suspended users can still sign in.

Use `alice`, `bob` or `carol` to try the tenant switcher. The dashboard's Admin panel only shows in tenants where you're an Admin; it shows static sample data, so it is display-only and the API enforces every real permission.

Running `pnpm db:seed` again is safe. It updates the existing records instead of creating duplicates.

## Scripts

Run these from the repo root.

| Script | What it does |
|---|---|
| `pnpm api:dev` | Start the API in watch mode |
| `pnpm api:build` / `pnpm api:start` | Build the API / run the build |
| `pnpm portal:dev` | Start the portal in dev mode |
| `pnpm portal:build` / `pnpm portal:start` | Build the portal / run the build |
| `pnpm db:up` / `pnpm db:down` | Start / stop the PostgreSQL container |
| `pnpm db:migrate` | Create and apply migrations after a schema change (development) |
| `pnpm db:deploy` | Apply existing migrations without creating new ones (production) |
| `pnpm db:seed` | Load the test tenants and users |
| `pnpm db:reset` | Drop all data, re-apply migrations and re-seed |
| `pnpm --filter api test` / `pnpm --filter api test:e2e` | API unit tests / API HTTP tests (Jest, Prisma mocked, no database needed) |
| `pnpm --filter portal test` | Portal unit tests (Jest via `next/jest`) |
| `pnpm --filter portal test:e2e` | Portal end-to-end tests (Playwright + axe). Needs the API, the portal and PostgreSQL running; it reseeds the database |
| `pnpm --filter api lint` / `pnpm --filter portal lint` | Lint each app |

After changing `app/api/prisma/schema.prisma`, run `pnpm db:migrate --name <change>` and then `pnpm --filter api db:generate`.

## Run the tests

Both apps use Jest for unit and HTTP tests, and the portal adds Playwright for end-to-end and accessibility tests.

```bash
# API unit tests and API HTTP tests (supertest). Prisma is mocked: no database needed
pnpm --filter api test
pnpm --filter api test:e2e

# Portal unit tests (Jest via next/jest). No database or running app needed
pnpm --filter portal test

# Portal end-to-end tests (Playwright + axe), light and dark
pnpm --filter portal exec playwright install chromium   # once per machine
pnpm --filter portal test:e2e
```

The Playwright suite needs PostgreSQL running, migrated and seeded. It reuses the API and portal if they are already running on the ports from `.env`, and starts them otherwise. It runs one test at a time, reseeds the database with `pnpm db:seed` before and after the run and after every test that changes a role, so don't use the database for anything else while it runs. Traces and screenshots of failures go to the OS temp folder, not the repo.

## Environment variables

All variables live in the root `.env`. `.env.example` lists every one of them.

| Variable | Used by | Purpose |
|---|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | `docker-compose.yml` | Local PostgreSQL container |
| `DATABASE_URL` | API, Prisma | PostgreSQL connection string |
| `API_PORT` | API | Port the API listens on (falls back to `PORT`, then 3000) |
| `API_HOST` | API | Optional bind address. Empty listens on all interfaces (needed on Railway); set `127.0.0.1` locally to keep the API off the LAN |
| `PORTAL_URL` | API | Origin allowed by CORS |
| `JWT_SECRET` | API | Secret that signs access tokens |
| `JWT_EXPIRES_IN` | API | Token lifetime, e.g. `1d` |
| `PORTAL_PORT` | Portal | Port the portal listens on |
| `PORTAL_HOST` | Portal | Optional bind address for `portal:dev` / `portal:start`. Empty listens on all interfaces; set `127.0.0.1` locally |
| `NEXT_PUBLIC_API_URL` | Portal | Base URL of the API |

Telemetry: Next.js and the Prisma CLI send anonymous usage data by default. Opt out with `pnpm --filter portal exec next telemetry disable` and `CHECKPOINT_DISABLE=1`.

## How it works

- **Login:** the portal posts the username and password to `POST /auth/login`. The API checks the bcrypt hash and returns a JWT. The portal stores it in an httpOnly `session` cookie, so browser JavaScript can't read it.
- **Dashboard:** the portal's server calls `GET /auth/me` with that token to get the user and their tenants. The selected tenant is kept in the URL (`/dashboard?tenant=acme`).
- **Route protection:** `app/portal/src/proxy.ts` sends visitors without a session cookie to `/login`. The dashboard also redirects to `/login` when the API rejects the token, for example once it expires.
- **Members page:** `/dashboard/members?tenant=acme` lists the tenant's members in a List or Chart view (`?view=chart`); search, role filter and sort are in the URL too. The server loads the list inside `<Suspense>` (`lib/members.ts`) and hands it to TanStack Query.
- **Client refetch (BFF GET):** the browser refetches through `GET /bff/tenants/:tenantId/members`, a same-origin route that reads the session cookie, calls the API with the Bearer token and returns only the contract fields. The token never reaches the browser.
- **Role changes (Server Action):** `updateMemberRole` in `dashboard/members/actions.ts` validates the input, calls `PATCH /tenants/:tenantId/members/:userId` and returns a typed result. The UI updates optimistically and rolls back on failure.
- **Tenant isolation and authorization:** the API takes the tenant from the path and checks the membership and role in the database on every request (`TenantMemberGuard`); the token only carries `{ sub, username }`.

### Data model

```
User ──< TenantUser >── Tenant
          role: ADMIN | MEMBER
```

`User.status` is `ACTIVE`, `INVITED` or `SUSPENDED`. It is an account-level value that the members page displays; it doesn't affect login or role changes yet.

The schema is in `app/api/prisma/schema.prisma`, the migrations are in `app/api/prisma/migrations/` and the seeder is `app/api/prisma/seed.ts`.

## Project structure

```
.
├── .env.example            # every environment variable
├── docker-compose.yml      # local PostgreSQL
├── TASKS.md                # assessment tasks: start here
└── app/
    ├── api/
    │   ├── prisma/         # schema, migrations, seeder
    │   ├── test/           # HTTP tests and the Prisma mock
    │   └── src/
    │       ├── auth/       # login, /auth/me, JWT guard
    │       ├── members/    # members list and role change (controller, service, DTO)
    │       ├── tenancy/    # TenantMemberGuard, @CurrentTenant, @RequireTenantRole
    │       └── prisma/     # PrismaService
    └── portal/
        ├── e2e/            # Playwright tests
        └── src/
            ├── app/
            │   ├── login/      # login page and form
            │   ├── bff/        # same-origin GET route for client refetches
            │   └── dashboard/  # dashboard and tenant switcher
            │       └── members/    # members page, Server Action, role control
            │           └── org-chart/  # lazy-loaded chart view
            ├── components/ui/  # shadcn components
            ├── lib/            # API client, session cookie, members contract, query client
            └── proxy.ts        # redirects signed-out visitors
```

## Members page

- **Theme:** light and dark follow the OS. To preview both, open DevTools → Rendering → "Emulate CSS media feature prefers-color-scheme".
- **Roles:** admins change roles with the Role select in the list or the ⋯ menu on a chart card. Removing admin access asks for confirmation. You can't change your own role.

### How to see each UI state

| State | How |
|---|---|
| Loading | DevTools → Network → throttle to "Slow 4G" and reload `/dashboard/members` |
| No access | Sign in as `carol` and open `/dashboard/members?tenant=acme` |
| Load error | Open the page, stop the API, wait 30 s and switch tabs (a background refetch fails), then start the API and press "Try again" |
| Only you | Sign in as `frank` (Wayne Logistics) |
| No results | Sign in as `alice` and open `/dashboard/members?q=zed` |
| Read-only roles | Sign in as `bob` and open `/dashboard/members?tenant=acme` |
| Invited member | Sign in as `dave` (Umbrella Holdings, heidi) |
| Suspended member | Sign in as `erin` (Stark Enterprises, ivan) |
| Empty | Not reachable through the API (the viewer is always a member); covered by unit tests as a fallback |

## Verify the members API

The members endpoints are scoped by the tenant in the path and need a Bearer token:

| Method | Path | Who |
|---|---|---|
| `GET` | `/tenants/:tenantId/members` | any member of the tenant |
| `PATCH` | `/tenants/:tenantId/members/:userId` with `{ "role": "ADMIN" \| "MEMBER" }` | tenant admins |

Every error body has the shape `{ statusCode, error, code, message }`.

Start the API and seed the database first, then run these steps in Bash from any folder. `API` defaults to the README's API URL; use your `API_PORT` from `.env`, for example `API=http://localhost:3100`.

```bash
API=${API:-http://localhost:3000}
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log($1)})"; }
login() { curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"123456\"}" | json 'o.accessToken'; }
me() { curl -s "$API/auth/me" -H "Authorization: Bearer $1" | json "$2"; }
ALICE=$(login alice); BOB=$(login bob); CAROL=$(login carol)
ACME=$(me "$ALICE" "o.tenants.find(t=>t.slug==='acme').id")
ALICE_ID=$(me "$ALICE" o.id); BOB_ID=$(me "$BOB" o.id); CAROL_ID=$(me "$CAROL" o.id)
M="$API/tenants/$ACME/members"
patch() { curl -s -w ' %{http_code}\n' -X PATCH "$M/$2" -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "$3"; }
```

| # | Step | Command | Expected |
|---|---|---|---|
| 1 | No token | `curl -s -w ' %{http_code}\n' "$M"` | `401` |
| 2 | Invalid token | `curl -s -w ' %{http_code}\n' "$M" -H 'Authorization: Bearer nope'` | `401` |
| 3 | Non-member reads Acme | `curl -s -w ' %{http_code}\n' "$M" -H "Authorization: Bearer $CAROL"` | `404 TENANT_NOT_FOUND` |
| 4 | Malformed tenant id | `curl -s -w ' %{http_code}\n' "$API/tenants/acme/members" -H "Authorization: Bearer $ALICE"` | `404 TENANT_NOT_FOUND` (same body as 3) |
| 5 | Admin reads Acme | `curl -s -w ' %{http_code}\n' "$M" -H "Authorization: Bearer $ALICE"` | `200`, alice and bob with role and status |
| 6 | Member changes a role | `patch "$BOB" "$ALICE_ID" '{"role":"MEMBER"}'` | `403 NOT_TENANT_ADMIN` |
| 7 | Unsupported role | `patch "$ALICE" "$BOB_ID" '{"role":"OWNER"}'` | `400 VALIDATION_FAILED` |
| 8 | Missing role | `patch "$ALICE" "$BOB_ID" '{}'` | `400 VALIDATION_FAILED` |
| 9 | Extra field | `patch "$ALICE" "$BOB_ID" '{"role":"ADMIN","tenantId":"x"}'` | `400 VALIDATION_FAILED` |
| 10 | Malformed user id | `patch "$ALICE" bob '{"role":"ADMIN"}'` | `400 VALIDATION_FAILED` |
| 11 | Admin demotes themselves | `patch "$ALICE" "$ALICE_ID" '{"role":"MEMBER"}'` | `409 SELF_DEMOTION_FORBIDDEN` |
| 12 | User of another tenant | `patch "$ALICE" "$CAROL_ID" '{"role":"ADMIN"}'` | `404 MEMBER_NOT_FOUND` |
| 13 | Promote bob | `patch "$ALICE" "$BOB_ID" '{"role":"ADMIN"}'` | `200`, `"role":"ADMIN"` |
| 14 | Read it back | `curl -s "$M" -H "Authorization: Bearer $ALICE"` | bob has `"role":"ADMIN"` |
| 15 | Restore bob | `patch "$ALICE" "$BOB_ID" '{"role":"MEMBER"}'` | `200`, `"role":"MEMBER"` |
| 16 | Same role again | `patch "$ALICE" "$BOB_ID" '{"role":"MEMBER"}'` | `200`, nothing is written |

Rejected requests (steps 1 to 12) never change data. Run `pnpm db:seed` afterwards to return to the seed state.

## Troubleshooting

- **`EADDRINUSE` on port 3000 or 3001:** another process already uses the port. Find it with `lsof -nP -iTCP:3000 -sTCP:LISTEN`, then stop it or change `API_PORT` / `PORTAL_PORT` in `.env`.
- **Port 5433 already in use:** change `DB_PORT` in `.env`, and the port inside `DATABASE_URL` to match.
- **"Can't reach the API" on the login page:** make sure `pnpm api:dev` is running and `NEXT_PUBLIC_API_URL` points to it.
