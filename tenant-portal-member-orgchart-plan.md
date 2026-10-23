# Plan: Tenant Member Management + Org Chart (List & Diagram)

> This is the working plan used to drive Claude Code through the implementation, phase by phase. The design files it references (`design reference/`) were a local reference and are not part of the repository.
>
> **Requirement sources:** `Coding Assessment_ Tenant Member Management.pdf` (Benoz.ai) + `TASKS.md` in the local repo. The final design (Claude Design) is in the `design reference/` folder at the root of the same repo.
> **Created:** 2026-10-22. Library versions were verified against the npm registry on that date. The plan has been adversarially reviewed against the PDF, the repo code, and the library APIs.
>
> **How to use**
> 1. Run the phases in **ONE Claude Code session**, one phase per turn, from the repo root, in the order **P0 → P1 → P2 → P3 → P4a → P4b → P5a → P5b → P6 → P7 → P8 → P9**, then optionally P7b (see §9).
> 2. When opening a new session, after `/clear`, or after an auto-compact, **resend P0** before the next phase. Reason: the repo's `CLAUDE.md` loads `AGENTS.md`, which deliberately contains wrong guidance. That guidance is only fixed in P1.
>    - **Recommended:** run `/clear` and then resend P0 right **before P4a and before P5a**. Those two phases are the heaviest, and because their prompts are self-contained, both can start with an empty context.
>    - If an auto-compact happens **in the middle of** a phase: resend P0, then resend that phase's prompt with the following prefix (in English, exactly): `Resume: inspect git status/git diff and the files named below, do only the steps not yet done, then report the per-step checklist.`
> 3. The prompts are deliberately **self-contained**, so Claude Code does not need to read this plan file. The only external reference is the design files in `design reference/`, which are named directly in P0 and P4a–P7b (critical values and copy are also written directly into the prompts). The narrative was originally written in Indonesian; the prompt contents are in English because the code, comments, and SUBMISSION for the assessor must be in English.
> 4. **Browser checks are the owner's job.** Claude Code has no browser. For every browser check (DevTools, Network tab, keyboard, Lighthouse/axe, visual comparison against frames), Claude provides a numbered checklist (step, expected result, design frame id) and then STOPS. The owner runs that checklist and pastes the results. Claude only records the pasted results, labelled "manual (by me)", and never marks a browser item as done by itself. Checks that can be computed via the CLI (lint, build, test, grep, grepping the lazy chunk in `.next`) are still done by Claude itself.
> 5. Claude Code **does not commit**. At the end of each phase it proposes a commit message, and the owner commits to the fork. TASKS.md asks for *"committing to your fork as you go"*.
> 6. The DB and the API/portal are run by the owner. Claude Code does not start Docker or any server.
> 7. **The design is finished.** The Claude Design output from `tenant-portal-members-design-brief.md` is in `design reference/` (the folder name contains a space, so always quote it in the shell). The canonical files are:
>    - `tokens.css`: light and dark tokens.
>    - `Members Page.dc.html`: the interactive page containing the markup and React logic in `<script type="text/x-dc">`.
>    - `Members Handoff Spec.dc.html`: component specs, card states, the 38-pair contrast table, the rationale for token changes from brief §2b, 7 shadcn deviations, and snippets.
>    - `Members Frames.dc.html`: an index of 31 scenarios (D01–D21, S1–S3, T1–T3, M1–M4), each in light and dark.
>
>    **Ignore** the superseded v1 design file, `fonts/` and `.thumbnail`. All three are an earlier iteration that used a different design system and font. Claude Code never runs, serves, or imports `support.js`.
>
>    **Visual comparison against frames is done by the owner, not Claude.** `Members Frames.dc.html` is only an iframe index pointing to `Members Page.dc.html?view=…&theme=Light|Dark`, and both files load `./support.js`. Claude compares from **text** only: it looks up the frame's query params in `Members Frames.dc.html` (the `DEFS` array), then matches its markup, classes, and copy against the corresponding markup/DCLogic branch in `Members Page.dc.html`. For pixel comparison in both themes, the owner opens the design files in a browser:
>    1. First try opening `Members Frames.dc.html` (or `Members Page.dc.html?view=list&theme=Dark`) directly via `file://`.
>    2. If the page is blank, run a temporary static server from the repo root on a free port that is **not** 3000, 3001, or the `API_PORT` from `.env` (see §0), for example `npx --yes http-server "design reference" -p 8790`, open `http://localhost:8790/Members%20Frames.dc.html`, then stop the server (Ctrl+C) when done. Python is not installed on the development machine, so do not use `python -m http.server`.
>
>    The precedence rules are already embedded in P0 and repeated in P4a–P7b, so there is no need to add any sentence to the prompts manually:
>    - **The design wins** for visuals, sizes, tokens, copy, and layout.
>    - **The prompt wins** for behaviour, security (tenant validated from the DB, authorization flags from the API, no authz in the frontend), and PDF scope (the core/P7b split).
>    - Every conflict is recorded in SUBMISSION.
>
>    The design's preview knobs are **not product features** and are not built: the System/Light/Dark theme switch and the `[data-theme]` selector, the `viewer`/`dataset`/`orgAccess`/`dataState`/`saveResult`/`toastPreview`/`mobileList` props, the `sel`/`collapse`/`demo`/`toastPreview` URL params, the "Illustrative stress (24)" dataset with its ILLUSTRATIVE banner (and the use of Geist Mono in that banner; the existing `Geist_Mono` import in `layout.tsx` is kept because the login page's `<code className="font-mono">` uses it), the 900 ms mock delay together with roles/permissions computed in the frontend, and the "Read-only overview…" chart note that is never rendered.
>
>    The tenant name shown in the mock is only a placeholder tenant name for tenant `acme`. The product always displays `tenant.name` from the API, and the seed stays "Acme Corporation".

---

## 0. Environment setup (done by the owner, before P0)

Audit of the development machine on 2026-10-22:
- Node 26.10.0 and pnpm 11.8.0 are suitable (the `engines` of all main packages cover Node 26).
- pnpm `script-shell` = Git Bash, so the portal's `sh -c` scripts run.
- **No Docker.**
- **Port 3000 is already in use** by another local project's dev server, and **PostgreSQL 18** runs as a service on port 5432.

1. **Git:** the repo root is this folder, where the plan and `design reference/` live. TASKS.md asks for a private fork. The problem: this folder, extracted from a zip, is **not a git repo**, while the plan uses `git status/diff/ls-files`. The owner runs all git commands.
   - First, run `git init`. Then add these two lines to `.git/info/exclude` (not `.gitignore`, so that the rule itself is not committed): `tenant-portal-member-orgchart-plan.md` and `design reference/`. Reason: the plan contains details of the development machine and of another local project, while the design folder contains the superseded v1 variant (a different design system and font), the `support.js` runtime, and a placeholder tenant name. `.env` is already covered by `.gitignore` (`.env*`).
   - (a) **The fork already contains the original commits** (recommended):
     1. `git remote add origin <fork-url>`
     2. `git fetch origin`
     3. `git remote set-head origin -a`
     4. `git reset origin/HEAD`. Its default mode is mixed, so only HEAD and the index move; working files are not touched.
     5. `git switch -c <default-branch-name>`, or `git branch -u origin/<default>` if already on that branch.

     After that, `git status` must be clean or show only the differences the owner expects from the zip. The plan and design must not appear. If any other repo file shows as changed, stop and compare first.
   - (b) **The fork is still empty:** initial commit "Initial import from assessment zip", `git remote add origin <fork-url>`, then push.
   - Mentioning the design in SUBMISSION is enough. If you want to include frame screenshots, save PNGs of your own choosing in `docs/design/`.
2. **Database:** the local PG18 is used instead of `docker compose` (PG17). Prisma 7 supports PG 9.6–18. Create a **dedicated** role and database so they are separate from other databases on the same instance (for example, databases of another local project). Run as the `postgres` superuser (psql is not on the PATH).

   Git Bash:
   ```bash
   "/c/Program Files/PostgreSQL/18/bin/psql.exe" -U postgres -h localhost -p 5432 \
     -c "CREATE ROLE tenant_portal LOGIN PASSWORD 'tenant_portal' CREATEDB;" \
     -c "CREATE DATABASE tenant_portal OWNER tenant_portal;"
   ```
   PowerShell:
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE ROLE tenant_portal LOGIN PASSWORD 'tenant_portal' CREATEDB;" -c "CREATE DATABASE tenant_portal OWNER tenant_portal;"
   ```
   `CREATEDB` is needed because `prisma migrate dev` creates a shadow database. Do not use the `postgres` role in `.env`.
3. **`.env`**: copy it from `.env.example` (`cp .env.example .env` in Git Bash, or `Copy-Item .env.example .env` in PowerShell), then change the following lines so they do not clash with another local project on :3000. `DB_PORT` is only read by docker-compose, so changing it is optional.
   ```dotenv
   DB_PORT=5432
   DATABASE_URL=postgresql://tenant_portal:tenant_portal@localhost:5432/tenant_portal?schema=public
   API_PORT=3100
   NEXT_PUBLIC_API_URL=http://localhost:3100
   ```
   `PORTAL_PORT=3001` and `PORTAL_URL=http://localhost:3001` stay as they are (port 3001 is free). Replace `JWT_SECRET` with a random string (`openssl rand -base64 32`). Every curl in the prompts that mentions port 3000 means **API_PORT from .env (3100)**. Port 3100 is stored only in `.env` and is mentioned only in this section and in P0; the other prompts refer to it as "API_PORT from .env (see P0)". The README, `.env.example`, and code fallbacks keep the repo defaults (API 3000 / portal 3001).
4. **Install:** `pnpm install` (automatically runs `prisma generate`; the only allowed install scripts are Prisma and esbuild), then `pnpm db:migrate`, then `pnpm db:seed`. Check that the seed output shows *Tenants: 7 total*, *Users: 10 total*, *Memberships: 13 total*.
5. **Run them yourself** in two terminals: `pnpm api:dev` (:3100) and `pnpm portal:dev` (:3001). Log in as `alice` / `123456`. The Members page does not exist yet; it is only built in P5a.
6. **Do not** run:
   - `pnpm db:up`/`db:down` (there is no Docker);
   - the API deploy script, i.e. `pnpm --filter api run deploy` (= `nest deploy`). Note: `pnpm --filter api deploy` without `run` is a built-in pnpm command, not this script;
   - `mau deploy` or `pnpm install -g @nestjs/mau`;
   - `pnpm install @nestjs/observe`.
7. **`rg` (ripgrep) is not on the PATH.** All grep checks in the prompts use Claude Code's Grep tool or `grep -rnE`.
8. **Local security note:** PG18 listens on `0.0.0.0:5432`, meaning it is reachable from the LAN. Use a password not used anywhere else, or restrict `listen_addresses`/`pg_hba.conf` to localhost if you often use public Wi-Fi.

---

## 1. Decision summary

| # | Decision | Reason |
|---|---|---|
| D1 | Org chart hierarchy: **Tenant → role group (Admins / Members) → member card**. No `managerId`. | Uses only the data that exists, so it stays in scope. |
| D2 | One page `/dashboard/members` with two views: **List (default)** and **Chart**. The view is stored in the URL `?view=list\|chart`. | List is the primary, accessible view. Chart is an enhancement. The URL makes the view shareable, persistent across reloads, and compatible with the back button. |
| D3 | Tenant context is **validated by the server from the DB on every request**. The route becomes `/tenants/:tenantId/members`, and the `x-tenant-id` header is ignored. | Requirement 3. |
| D4 | Authorization is **read from the DB, not from JWT claims**. `isTenantAdmin` is removed and the `tenants` claim is dropped from the token. | If it came from the JWT, a role could be stale for up to 1 day after an admin is demoted. |
| D5 | **Account status** = `enum UserStatus { ACTIVE INVITED SUSPENDED }` on `User` (account level, not per tenant). Display only: it does not affect login or role changes (a SUSPENDED member can still be promoted). | Requirement 1 asks for "Account status" but the schema has no column for it yet. Status enforcement is future-work priority #1. |
| D6 | Full set of dependencies, **each one justified** (§4). React Flow is lazy-loaded. | The user's decision. The "avoid unnecessary dependencies" constraint is answered with written justification. |
| D7 | Initial load via `lib/getMembers` inside `<Suspense>` (repo convention). Client refetch via a same-origin **BFF Route Handler**. Mutations via a **Server Action**. The browser never calls NestJS directly. | The token is stored in an httpOnly cookie and the API lives on another origin. Server Actions have a built-in CSRF origin check. |
| D8 | No `'use cache'` for member data. The client cache is owned by TanStack Query. | Repo trap: the JWT ends up in the cache key and stale roles get served. |
| D9 | **Every tenant member may view the list** (name, email, role, status) read-only. Only an ADMIN can change roles. | Requirement 3 restricts *update*, not *read*. Trade-off: emails are visible to fellow members (the workspace-directory pattern). If admin-only is wanted, just add `@RequireTenantRole(ADMIN)` to the GET. |
| D10 | **Scope tiers.** *Core* = the PDF requirements plus the minimum features that justify each library. *Polish* (P7b) is only done after tests, build, and hosting are green, and may be skipped. | PDF: *"A smaller, correct, well-tested implementation is preferable."* |
| D11 | A `?tenant=` slug that does **not** belong to the user on the Members page shows a *no-access* state without fetching. Without `?tenant` it falls back to the first tenant. Dashboard Overview is not changed. | On the page where roles are changed, silently showing another tenant under a URL that names tenant A is risky. |
| D12 | **The Claude Design design** (`design reference/`: tokens.css, Members Page, Handoff Spec, Frames) is the source for visuals, sizes, tokens, copy, and layout. The plan still wins for behaviour, security, and scope. The design's preview knobs are not built. | The final design has been reviewed for AA contrast in both themes. Conflicts are recorded in SUBMISSION. |

---

## 2. Repo traps and deliberate deviations from repo conventions (goes into "Where I disagreed")

`TASKS.md`: *"The repo may contain outdated or incorrect guidance… the requirement wins."*

| Location | Repo guidance | What is done |
|---|---|---|
| `AGENTS.md` (Tenant context), `current-tenant.decorator.ts` | "The gateway validates `x-tenant-id`; don't look up membership." That gateway does not exist. | `TenantMemberGuard` checks membership in the DB. The tenant is taken from the path param. |
| `AGENTS.md` (Authorization), `tenant-access.ts` | `isTenantAdmin` reads membership from the JWT. | The helper is removed. The role is read from the DB and re-read inside the PATCH transaction. |
| `AGENTS.md` (API handlers), `update-member-role.dto.ts` | `@IsString()` is considered enough because the portal has a `<select>`. | `@IsEnum(TenantRole)` + `forbidNonWhitelisted`. |
| `AGENTS.md` (API handlers) | "A single `update` is enough; there is a global exception filter." That filter does not exist. | A transaction with a lock, P2025 mapped to 404, plus a stable error `code`. |
| `AGENTS.md` (Portal data fetching), `lib/members.ts` | `'use cache'` with the token as an argument. | Removed. Fetch uses `no-store`. |
| `AGENTS.md` (Portal data fetching) | "Server-side data loading lives in lib, pages call inside Suspense." | **Still followed** for the initial load. Plus a dedicated BFF GET for TanStack Query client refetches (a deliberate deviation). |
| `app/api/README.md:87-96` | An invitation to install `@nestjs/observe`. | **Not installed** (PII telemetry to a third party, out of scope). |
| `app/api/package.json` `deploy` | `nest deploy` (Mau cloud). | **Not run.** Hosting follows TASKS.md. |
| `test/app.e2e-spec.ts` | Boots the app without mocks, so it needs a DB and `.env`. CI has no PostgreSQL. | **Edited in place** (the name and the `GET /` assertion stay) to use the mocked harness. Not deleted. |
| `main.ts` CORS | An empty `PORTAL_URL` makes CORS `*`. | `origin: portalUrl ? [portalUrl] : false`. |

---

## 3. Architecture

```
Browser (client components)
 ├─ List view  ─┐  TanStack Query key ['tenants', tenantId, 'members']  (one source of truth)
 ├─ Chart view ─┘  (chart chunk lazy-loaded)
 │   refetch → GET /bff/tenants/:tenantId/members   (same-origin Route Handler, GET only)
 │   mutate  → Server Action updateMemberRole(...)  (built-in Origin/Host CSRF check)
 ▼
Next.js 16 portal server
 ├─ dashboard/members/page.tsx (RSC): everything request-bound inside <Suspense>;
 │    getCurrentUser → resolve tenant → qc.query(getMembers) → HydrationBoundary
 ├─ bff/.../route.ts  → cookie → Bearer → API → toMembersResponse()
 └─ dashboard/members/actions.ts → cookie → Bearer → API → typed result
 ▼  server-to-server only
NestJS 12 API
 ├─ AuthGuard (JWT {sub, username})
 ├─ TenantMemberGuard (DB: tenantId + sub → req.tenant {tenantId, role}; 404 if not member)
 ├─ @RequireTenantRole(ADMIN) on PATCH → 403
 └─ MembersService: $transaction + SELECT … FOR NO KEY UPDATE on the tenant row
 ▼
PostgreSQL (local: PG18 on :5432; repo docker-compose: 17)
```

| State | Owner |
|---|---|
| Member data + mutation status | TanStack Query (do not copy it into Zustand) |
| `tenant` (slug), `view`, `q`, `role` (filter), `sort` | URL. `view/q/role/sort` via nuqs (shallow). When the tenant changes, `q/role/sort` are reset and `view` is kept. |
| `selectedId`, collapsed groups, demote confirmation target | Zustand (per-provider store, keyed by `tenantId`) |
| Viewport, zoom | React Flow's internal store |
| Permissions (`canManageRoles`, `canChangeRole`) | **The API response.** Never computed in the frontend. |

---

## 4. Stack & dependency justification (portal)

Versions = `latest` on npm as of 2026-10-22. API: **no new dependencies.**

| Package | Version | Why | Important notes |
|---|---|---|---|
| `shadcn` (CLI/devDep) + `radix-ui`, `cn`, `class-variance-authority`, `lucide-react`, `tw-animate-css` | 4.22.1 / 1.8.1 / 0.5.0 / 0.7.1 / 1.61.0 / 1.4.0 | Consistent accessible components (Radix) | **`-b radix` is mandatory** because the 4.22.1 default is Base UI. No postcss. |
| `sonner` (+ `next-themes` installed alongside) | 2.0.8 | Success/neutral/failure toasts, acting as `aria-live` | Do not mount `ThemeProvider`. Dark mode still uses `prefers-color-scheme`. Use `<Toaster theme="system" position="bottom-right" richColors closeButton visibleToasts={3} duration={6000} />`. Its colours are mapped to the `--toast-*` and `--popover*` tokens via Sonner's CSS variables, because the design darkens the success/error text in the light theme (#007a29 / #cc0000). |
| `@tanstack/react-query` (+ dev-only devtools, eslint plugin) | 5.104.5 | Per-tenant cache, optimistic update + rollback, one data source for 2 views | `environmentManager.isServer()`, `queryClient.query()` (`isServer`/`prefetchQuery` are deprecated) |
| `@tanstack/react-table` | 9.3.1 | Sortable headers + filtering in List (the shadcn data-table pattern) | **v9 API** (`useTable`, `tableFeatures`, `table.FlexRender`) |
| `zustand` | 5.0.16 | List selection → Chart focus hand-off, group collapse, confirmation target | Per-provider store (`createStore` + context). **Do not** use a global `create()`. |
| `nuqs` | 2.10.2 | Typed, shallow URL state (`view/q/role/sort`) | Changing the view or search does not trigger an RSC re-render |
| `@xyflow/react` | ^12.12.0 | Org chart: pan, zoom, fitView, focusable HTML nodes | ~60 KB gzip, so **lazy** (`ssr:false` from a `'use client'` file). Do not use `13.0.0-next`. |
| `vitest` (portal devDep) | ^4.1.2 (same as app/api) | Unit tests for the portal's pure modules | The test framework the repo already uses |

**Impact of the design on dependencies:** no new libraries.
- The mock's custom pan/zoom is replaced by React Flow. Menus, dialogs, and tooltips use shadcn/Radix.
- `popover` (shadcn) is added **only in P7b** for the chart legend.
- Components produced by `shadcn add` are adjusted for the 7 deviations in Handoff Spec §7: solid 2px focus ring with 2px offset, a darker `--input`, active ToggleGroup item = primary, Sonner colour overrides, Tooltip openable by tap, two-line SelectItem, and 40px touch targets below 640px.
- **Radius:** the shadcn radius scale is locked to the design's pixels via `@theme` tokens (details in P4a).
- **Font:** Geist 400/500/600 via the `next/font` the portal already has. The Google Fonts link from the design files is not copied, and the font of the superseded v1 design is not used. The existing `Geist_Mono` import is **kept** (used by `font-mono` on the login page); the only thing not built is the use of Geist Mono in the design's preview banner.

**Rejected:** `elkjs` (1.45 MB, EPL/GPL), `dagre`/`d3-hierarchy` (all leaves in a single row, so the canvas becomes too wide), `d3-org-chart` (innerHTML, XSS-prone), `react-organizational-chart` (no pan/zoom), `html-to-image` (scope creep), `@nestjs/observe`, `helmet`/`@nestjs/throttler` (future work).

---

## 5. API contract

| Method | Path | Guard | Body | Success |
|---|---|---|---|---|
| GET | `/tenants/:tenantId/members` | Auth + TenantMember | – | `200 MembersResponse` |
| PATCH | `/tenants/:tenantId/members/:userId` | Auth + TenantMember + `@RequireTenantRole(ADMIN)` | `{ "role": "ADMIN" \| "MEMBER" }` | `200 MemberDto` (a no-op is also 200) |

```ts
type Role = 'ADMIN' | 'MEMBER';
type MemberDto = {
  userId: string; name: string; email: string; role: Role;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: string; isSelf: boolean; canChangeRole: boolean; // viewer.canManageRoles && !isSelf
};
type MembersResponse = {
  viewer: { userId: string; role: Role; canManageRoles: boolean };
  members: MemberDto[]; // role (ADMIN first), name, userId
};
```

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | invalid or missing role, extra fields, `userId` is not a UUID. *(Malformed JSON is rejected by body-parser with Nest's default 400 without a `code`; this is documented.)* |
| 401 | – | token missing, invalid, or expired |
| 403 | `NOT_TENANT_ADMIN` | a MEMBER calls PATCH, or the actor is demoted mid-transaction |
| 404 | `TENANT_NOT_FOUND` | not a member, tenant does not exist, malformed `tenantId`, or the actor's membership disappears mid-transaction (identical body) |
| 404 | `MEMBER_NOT_FOUND` | the target is not a member of this tenant (including a user of another tenant or a random UUID) |
| 409 | `SELF_DEMOTION_FORBIDDEN` | an admin demotes themselves |
| 409 | `LAST_ADMIN_REQUIRED` | *invariant guard (defense in depth)*: not reachable through the current flow, tested with a mocked `count` |
| 409 | `ROLE_CHANGE_CONFLICT` | transaction timeout or conflict (P2028/P2034) |
| 500 | – | unexpected error (Prisma messages are never sent to the client) |

Portal-only codes: `UNAUTHENTICATED` (401 → clear cache + reload to `/login`, no failure toast), `API_UNAVAILABLE` (503, the API cannot be reached), a local `VALIDATION_FAILED` from the Server Action (400), and from the BFF: `FORBIDDEN` (cross-site), `UPSTREAM_ERROR` and `UPSTREAM_SHAPE` (502). Guards run before pipes, so a MEMBER sending an invalid role gets 403, not 400.

---

## 6. UI/UX specification

### 6.1 Navigation
- A shared header (`AppHeader`, `bg-background border-b`, container `max-w-6xl px-4 py-3`) is rendered **inside** the `<Suspense>` boundary on both pages. The header skeleton has the same height so there is no layout shift.
- **Header contents, left to right:**
  - Logo: a 32×32 `rounded-lg bg-primary` tile with the letter "T", `role="img"`, `aria-label="Tenant Portal"`.
  - `TenantSwitcher` with the sr-only label "Organization". It looks like a native select: h-9, `border-input`, `shadow-elev-sm` (= the design's `--shadow-sm`; Tailwind v4's `shadow-sm` has a different value), 16px chevron. Options are formatted "{tenant name} · {Admin|Member}". The role is taken from the `/auth/me` tenant data (enum `ADMIN`/`MEMBER`) and only mapped to the display labels "Admin"/"Member", as `tenant-switcher.tsx` already does. This label is never used to grant access.
  - `<nav aria-label="Main">` containing `Overview | Members`, 12px (`ml-3`) from the switcher with `gap-1` between links. Inactive links have a 150ms colour/background transition. The active link uses `aria-current="page"`, `bg-muted` (unchanged on hover), and a 2px inset `--primary` underline.
  - On the right: the user's name plus "@{username}" in a muted colour, then an outline **Sign out** button.
- Below 640px, the name block is hidden and the nav moves to a second row inside `<header>`. This switch uses Tailwind classes only.
- Foreign slug: the switcher shows a disabled "Choose an organization" option followed by the user's tenants.
- `TenantSwitcher` keeps the pathname and `view`, and drops `q/role/sort`. The plan wins here: the design mock does not reset q/role.
- Static tab title `Members · Tenant Portal`. The `<h1>` contains "{tenant name} · Members" (24/32 600, tracking -0.025em), or just "Members" when not a member.

### 6.2 Layout (actual seed data: Acme = alice ADMIN + bob MEMBER)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [T] [Acme Corporation · Admin ▾]  Overview  Members      Alice Anderson @alice [Sign out] │
├──────────────────────────────────────────────────────────────────────────┤
│ Acme Corporation · Members                                               │
│ 2 people · 1 admin · You are an Admin                  [≡ List][⑂ Chart] │
│ [🔍 Search name or email     ] [Role: All ▾]                    2 of 2  │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Name ↕            Email ↕             Role ↕       Status    Joined ↕ │ │
│ │ (AA) Alice Anderson (you)  alice@example.com  [🔒 Admin]  ● Active  Oct 20, 2026 │ │
│ │ (BB) Bob Brown     bob@example.com     [Member ▾]   ● Active  Oct 20, 2026 │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

```
CHART (h min(70dvh,720px), min-h 380px; toolbar: … [Role: All ▾] [↺ Reset view] [?]*   2 of 2)
                 ┌──────────────────────────┐
                 │ [A] Acme Corporation      │  280×80
                 │     2 people              │
                 └────────────┬─────────────┘
          ┌───────────────────┴───────────────────┐   (64px)
 ┌────────┴──────────┐   64px   ┌──────────┴─────────┐
 │ ▾ Admins (1)      │          │ ▾ Members (1)      │
 │ ┌───────────────┐ │          │ ┌────────────────┐ │
 │ │AA Alice (you) │ │          │ │BB Bob Brown  ⋯ │ │  240×72
 │ └───────────────┘ │          │ └────────────────┘ │
 └───────────────────┘          └────────────────────┘
 [+]
 [−]
 [⤢]  (Controls bottom-left)                      React Flow (attribution)
```
`*` [?] = legend, P7b only. Page container: `max-w-6xl px-4 py-8 gap-6` on `--page`.

INVITED/SUSPENDED status: log in as **dave** (umbrella → heidi INVITED) or **erin** (stark → ivan SUSPENDED).

### 6.3 States (requirement 1)

All states are determined by **a single pure function** `deriveMembersViewState`. Priority order, from top to bottom:

Copy is taken verbatim from the design (`Members Page.dc.html`); the plan's copy is only used for states that were not designed.

| State | Condition | List | Chart | How to reproduce |
|---|---|---|---|---|
| `loading` | pending | The Suspense fallback uses the same `<main>` and classes as the finished page: a title block (an h-8 bar or a static h1 "Members"), a summary row "Loading members…" + an inert 34px toggle placeholder, then a placeholder as tall as the toolbar (so there is no layout shift; a small deviation from the design, which hides the toolbar). Skeleton card `aria-busy="true"` `aria-label="Loading members"`: a 41px header strip and **5 rows** of 52px containing a 32 circle, 140×12 + 180×10 bars, a 140×36 block, a 72×14 bar, all `--muted` pulse. | A canvas-height card, `aria-busy` (not designed) | Throttle the network in DevTools |
| `no-access` | slug outside the user's tenants (no fetch), or a `TENANT_NOT_FOUND` error | h1 "Members", empty summary, toolbar hidden, toggle still shown. Empty card (Lock icon 24): "You're not a member of this organization" / "Choose one of your organizations from the menu at the top of the page." No link. The title block (h1, empty summary, toggle) is the same shared component as MembersView. The "Choose an organization" switcher placeholder only appears on the foreign-slug path (header rendered with a null tenant); on `TENANT_NOT_FOUND` from the API, the switcher still shows the selected tenant. | same | carol → `?tenant=acme` (frame D08) |
| `error` | any other error | A `role="alert"` card with an inline alert (`--alert-error-*` tokens, CircleAlert icon). Title "Couldn't load members". Body for API_UNAVAILABLE/network: "Check your connection and try again."; other codes: "Something went wrong while loading members. Please try again." Outline **Try again** button. Empty summary. | same | Stop the API, then refocus/click retry (D07) |
| `empty` | `members.length === 0` (defensive fallback; not reachable via the API because reading the list requires membership) | Empty "No members yet" (not designed; same Empty pattern) | Tenant node only | Unit test |
| `only-you` | no members other than yourself. Wins over `no-results`, also when a filter is active (the design mock only shows it without filters; the plan wins on precedence, recorded in SUBMISSION). Rows still follow the filter (your own row may be hidden, counter "0 of 1"); the only-you block is always shown and has no Clear filters button. | Your own row, then inside the same card a `border-t` block (Users icon 24): "You're the only member of {tenant}" / "People who join this organization will appear here." No button. | Empty Members group: "No one has this role." | **frank → wayne** (D05) |
| `no-results` | filter/search active and 0 results | The table header stays visible, tbody empty. Below the `<table>`, inside the card: Search icon 24, title "No members match". Body: with q → "Nothing matches “{q}”" + (role ≠ All ? " with role {Admin\|Member}" : "") + "."; role only → "No one has the {Admin\|Member} role." The outline **Clear filters** button is always the same; it resets only q and role, then focuses search. | Dimmed cards (border/bg, not text), counter "0 of N" | `?q=zed` (D09), `?role=ADMIN&q=bob` |
| `ready` | anything else | Table | Diagram | – |

Background refetch (not designed): a 16px muted Spinner right after the summary row, and the old data stays visible. Unexpected render errors are handled by `error.tsx` (with reset). A user with no tenants: Empty "You're not a member of any organization yet."

### 6.4 Changing a role (requirement 2)
- A single component `RoleControl({ member, tenantId, variant: 'select' | 'menu' })`: a `Select` in List and a `DropdownMenu` with a RadioGroup on the Chart card, using a single hook `useUpdateMemberRole`.
- The control only appears when `member.canChangeRole` (from the API). Otherwise a read-only Badge is shown (rounded-full, 12/16 500, `--badge-admin-*`/`--badge-member-*` tokens). Label in both variants: "Change role for {name}".
- **Select (List):** 136×36 trigger (40 on mobile), 14px regular trigger label. 264px content with two lines per option:
  - "Admin" / "Can change other members' roles"
  - "Member" / "Can view members, read-only"
  The description is placed outside `SelectItemText`, so the trigger only shows the role name. Options: `py-1.5 px-2`, rounded 4px, `gap-2 items-start`, Check icon 16 (`mt-0.5`), 2px between options, focus outline inset -2px.
- **Menu (Chart):** a 28px ⋯ button (40 on mobile), a 200px menu labelled "Role" with Admin/Member radios. Radio items h-8 (h-10 on mobile), px-2, rounded 4px; focus/hover use `bg-muted` without an outline; the selected indicator is an 8px `currentColor` dot in a 16px slot.
- **Selection:** opening the Select in a row, opening the ⋯ menu on a card, and every role change select that person (`selectedId`), as in the design.
- **Your own row or card:** "(you)". The role badge gets a 12px lock icon inside a `<button aria-describedby>`. The tooltip "You can't change your own role" is self-controlled: it opens on hover, focus, **and tap**, and closes on blur, leave, Esc, scroll, and window resize. It is positioned above the trigger, centred, 6px away (`side="top"`, `sideOffset={6}`), `px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap`, with a 150ms opacity transition.
- The reason the control is locked on your own row is conveyed via `aria-describedby` and the tooltip above.
- While pending, the trigger uses `aria-busy` and `aria-disabled` (not the `disabled` prop, so focus stays on the trigger). Changes are ignored in code, and the chevron is replaced by a spinner. A single global sr-only `aria-live="polite"` region announces "Saving role…".
- **Admin → Member** opens an `AlertDialog`:
  - Panel: max width 448px, p-6, rounded-xl, `--popover` + `--popover-border`, `--overlay` backdrop.
  - Title "Remove admin access for {name}?" (16/24 600), then the email in a muted colour.
  - A `<dl>` containing "Loses:" / "changing members' roles" and "Keeps:" / "access to {tenant} and the member list".
  - Buttons **Keep as Admin** (outline with a `--popover` background, not `--background`, so it blends with the panel; initial focus) and **Remove admin access** (`--destructive` without a border, hover `--destructive-hover`, text `--destructive-foreground`). Footer `flex-wrap`; Tab is trapped between those two buttons.
  - Esc **and a backdrop click** cancel. This needs a custom handler because Radix by default ignores outside clicks.
  - Single focus rule: in List, focus returns to the Select trigger. In Chart, after the card optimistically moves group (the node is remounted), focus goes to that card's ⋯ button (`.react-flow__node[data-id="${CSS.escape(userId)}"] button[aria-haspopup="menu"]`, falling back to the node wrapper). In `onCloseAutoFocus`, call `preventDefault()` when the opener is already `!isConnected`, so focus does not fall to `<body>`. This matches the design ("focus kept after card moves group").
  - Confirming re-checks `useMutationState` for that `userId` via the pure helper `canStartRoleChange(pendingUserIds, userId)` before `mutate`, so a dialog opened just before a mutation started cannot trigger a second mutation.
- **Member → Admin** runs immediately.
- Choosing the **same** role as the current one only closes the menu: no request and no toast (pure helper `isRoleChange(current, next)`).
- On success, the server's `MemberDto` is written to the cache, so the UI shows server data, not the optimistic guess.
- Optimistic: the badge/card changes immediately (the card moves group). Per-row spinner. Only **one pending mutation per member**: the control is `aria-disabled` + `aria-busy`, and open/onValueChange are ignored in code for **both** variants (Select and ⋯).
- Rollback is **per member** (restore the previous role for that `userId` only), so other in-flight mutations are not overwritten.
- One toast per person, with the id `role-{tenantId}-{userId}` from the pure helper `roleToastId(tenantId, userId)` (unit-tested in P7). The plan wins here; the design uses the person id only. A new result replaces the old toast instead of stacking.
- Toasts appear bottom-right, at most 3 visible, disappear after 6 seconds, and have a close button on the **right** of the toast (24px, 40px on mobile, opacity .8 → 1 on hover; the design's accessible name "Dismiss notification: {title}"). The region is labelled "Notifications" with `aria-live="polite"`. Visuals: width `min(356px, 100vw-32px)`, padding 14px 12px 14px 16px, rounded 8px, gap 10px, font-medium title, description `overflow-wrap: anywhere`. 16px icons: CircleCheck (success), Info (neutral), CircleAlert (failure).
- Promote uses `toast.success`: title "{name} is now an Admin", description "{email} · {tenant}".
- Demote uses a neutral `toast()` (`--popover`/`--popover-border`) with the Info icon: "{name} is now a Member", with the same description.
- Failure toasts use `toast.error`. The title is the message from the table below. The description "{name} is still a Member." / "{name} is still an Admin." (the restored role) is used **only** for codes that do not trigger an immediate invalidate: SELF_DEMOTION_FORBIDDEN, LAST_ADMIN_REQUIRED, API_UNAVAILABLE, and the generic fallback. For NOT_TENANT_ADMIN, MEMBER_NOT_FOUND, TENANT_NOT_FOUND, and ROLE_CHANGE_CONFLICT there is no description, because the role or the member's existence is refetched from the server and the server data speaks for itself. UNAUTHENTICATED still has no toast.

Failure toasts by code:

| code | Message (title) | Description | Extra action |
|---|---|---|---|
| `SELF_DEMOTION_FORBIDDEN` | You can't remove your own admin access. | "{name} is still an Admin." | – |
| `LAST_ADMIN_REQUIRED` | An organization needs at least one admin. | "{name} is still an Admin." | – |
| `NOT_TENANT_ADMIN` | You no longer have permission to change roles. | – | invalidate now (the control disappears) |
| `MEMBER_NOT_FOUND` | This person is no longer a member. | – | invalidate now |
| `TENANT_NOT_FOUND` | You no longer have access to this organization. | – | invalidate now (becomes no-access) |
| `ROLE_CHANGE_CONFLICT` | Someone else changed roles at the same time. Please try again. | – | invalidate now |
| `API_UNAVAILABLE` | Can't reach the server. Please try again. | "{name} is still a Member." / "{name} is still an Admin." (display label of the restored role) | – |
| `UNAUTHENTICATED` | (no toast; the page reloads immediately) | – | clear cache, delete cookie, `location.replace('/login')`, skip the invalidate in `onSettled` |
| other | Couldn't update the role. Please try again. | "{name} is still a Member." / "{name} is still an Admin." (display label of the restored role) | – |

- `onSettled`: invalidate only when `isMutating({ mutationKey: ['updateMemberRole', tenantId] }) === 1`.

### 6.5 Chart (core)
- **Read-only:** no drag, connect, select, or delete.
- **Layout:** a custom deterministic O(n) layout, with constants from the design:
  - Tenant node 280×80, top centre.
  - Admins group (left) and Members group (right) at y 144, 64px apart.
  - Group header 44, padding 24, cards 240×72, gap 16.
  - `cols = clamp(ceil(sqrt(max(n,1))), 1, 8)`.
  - Group height 44 when collapsed, and 112 when empty.
  - **Only 2 edges**: smoothstep, radius 12, stroke `--muted-foreground` 1.5.
- **Collapse/expand groups:** a 28px chevron button with `aria-expanded`, labelled "Collapse Admins" / "Expand Admins". A group with no members shows "No one has this role."
- **Search and role filter** use the same `q` and `role` as List.
  - Matching cards get a 2px `--match-ring` ring.
  - Non-matching cards are dimmed via **chrome**, not text: transparent bg, border `color-mix(--border 40%)`, badge and avatar without fill, dot at 40%, and the email goes up to `--foreground`.
  - A group with no matches: transparent bg, dashed border, muted title.
  - The counter stays "x of N".
- **Selected card:** bg `--selected`, border `--selected-border`, 2px `--ring` ring. This ring beats the match ring. A click or Enter on a member node wrapper sets `selectedId` (Zustand) via `onNodeClick`/a keydown handler; this is not React Flow selection (`elementsSelectable` stays false).
- **Entering Chart with a `selectedId`:** its group is expanded if collapsed, the card is centred at 100% zoom, then the card is focused. Without a `selectedId`: fitView.
- **Re-frame** happens after collapse/expand or after a card moves group.
- **"Reset view" button** in the toolbar (outline, h-9 px-3.5 gap-2, RotateCcw icon 16): expands both groups, clears the selection, then fitView.
- **Zoom:** `minZoom 0.2`, `maxZoom 1.6`, `fitViewOptions { padding: 0.06 (≈24px), maxZoom: 1 }`.
- **Controls** vertical at the bottom left (Zoom in / Zoom out / Fit view, 40×40, separated by a 1px `--border` line). The React Flow attribution stays visible.
- **Animation** 400 ms; `prefers-reduced-motion` makes the duration 0.
- Polish (P7b):
  - prev/next search result (Enter/Shift+Enter);
  - chunk prefetch on hover/focus of the toggle;
  - small-screen hint "Best viewed on a larger screen." + "Switch to List";
  - "Reading the chart" legend;
  - Invited cards with a dashed `--input` border (still dashed when dimmed; only the colour becomes color-mix 40%) and Suspended with a muted name.
- Deferred to future work (the seed has only 2–3 members per tenant, so it cannot be verified): MiniMap, `onlyRenderVisibleElements`, auto-collapse for large tenants.

### 6.6 Accessibility
- List is the default view: a semantic `<table>`, `aria-sort`, role control labels, visible focus, and a `ToggleGroup` toggle (`type="single"`) with `aria-label="View"`. As in the design, ArrowLeft/ArrowRight on the toggle also **switch the view** (via `onKeyDown`), not just move focus as Radix does by default. This deviation from shadcn behaviour is recorded in SUBMISSION.
- Chart lives in `<section id="panel-chart" aria-label="Members chart">`. Its canvas is `role="group"` with the aria-label "Org chart of {tenant}: {nA} admin(s), {nM} member(s). Drag to pan." and `aria-describedby` pointing to the sr-only help text "Use Tab to move between people. For a sortable table, switch to List view."
- Each node's `ariaLabel`:
  - tenant: "{tenant}, {n} people"
  - group: "Admins, 1 person" + ", collapsed" when collapsed
  - card: "Bob Brown, bob@example.com, Member, Active", with "(you)" after the name and ", not matching" when dimmed
- `ariaLabelConfig` is filled in. Tab order: tenant → Admins → admin → Members → member.
- Focus ring on every element: a solid 2px `--ring` outline with a 2px offset. In containers whose overflow is clipped (table rows, Select items), the offset is -2px; toggle items and Controls buttons use -4px. Radio items in the ⋯ menu use `bg-muted` without an outline (design).
- Selected row: sr-only text ", selected". Do not use `aria-selected` on a plain `<tr>`.
- Counter: `aria-live="polite"` with the sr-only prefix "Showing ".
- sr-only labels: "Organization" (switcher), "Search members by name or email", and the caption "Members of {tenant}".
- 40px touch targets below 640px.
- AA contrast in light and dark mode. Status is not distinguished by colour alone (dot + text). Toasts become `aria-live`.

### 6.7 Light & dark mode

- **Mechanism:** follows the OS (`prefers-color-scheme`), with no toggle and no `next-themes` provider. Because it is pure CSS (`@custom-variant dark (@media (prefers-color-scheme: dark))` + tokens inside `@media`), the first paint is already correct: no flash and no hydration mismatch. `:root { color-scheme: light dark; }` makes scrollbars and native controls follow the theme.
- **Tokens:** the single source is `design reference/tokens.css`, which is ported into `globals.css` as shadcn variables.
  - A `:root` block for light, and `@media (prefers-color-scheme: dark) { :root {…} }` for dark.
  - The `[data-theme]` selector in tokens.css is only used for frame previews and is **not ported**.
  - Non-shadcn tokens are exposed via `@theme inline`: `--page`, `--popover-border`, `--primary-hover`, `--destructive-hover`, `--destructive-foreground`, `--link`, `--selected`, `--selected-border`, `--match-ring`, `--badge-*`, `--status-*`, `--overlay`, `--alert-error-*`. `--toast-*` stay plain variables that are only mapped to Sonner (not via `@theme inline`). The built-in shadcn mappings (`--color-destructive`, `--color-popover`, `--color-muted`, etc.) remain after the port.
  - Components must not use hardcoded colours.
  - The existing `dark:` utilities in the dashboard keep working because the variant is the same (media query).
- **Radius:** locked to the design's pixels via `@theme inline` tokens (`--radius-sm` 4px menu/select items, `--radius-md` 6px inputs/buttons/menus, `--radius-lg` 8px chart cards/alerts/toasts/logo tile, `--radius-xl` 12px cards/dialogs/groups/canvas). `--radius: 0.625rem` remains, but its derived scale (6/8/10/14px) is not used as-is.
- **Per area** (final values from tokens.css):

| Area | Light | Dark |
|---|---|---|
| Page / card / popover (+ `--popover-border`) | `#fafafa` / `#ffffff` / `#ffffff` + `#e4e4e7` | `#09090b` / `#18181b` / `#27272a` + `#3f3f46` |
| Header bar, input, canvas (`--background`) | `#ffffff` | `#18181b` |
| Main text / muted | `#171717` / `#67676f` | `#ededed` / `#a1a1aa` |
| Decorative border / control border (`--input`) | `#e4e4e7` / `#85858e` | `#27272a` / `#71717a` |
| Primary / hover / text | `#4f46e5` / `#4338ca` / `#ffffff` | same (hover also `#4338ca`) |
| Link (`--link`) | `#4f46e5` | `#818cf8` |
| Focus ring (2px solid, offset 2px) / match ring | `#6366f1` / `#6366f1` | `#818cf8` / `#818cf8` |
| Destructive / hover / text | `#dc2626` / `#b91c1c` / `#ffffff` | same |
| Badge Admin / Member | `#e0e7ff` + `#3730a3` / `#f4f4f5` + `#3f3f46` | `rgba(99,102,241,.15)` + `#a5b4fc` / `#27272a` + `#d4d4d8` |
| Status dot Active / Invited / Suspended (+ `--foreground` label) | `#059669` / `#d97706` / `#f43f5e` | `#10b981` / `#f59e0b` / `#f43f5e` |
| Selected (bg + border) | `#eef2ff` + `#c7d2fe` | `rgba(99,102,241,.12)` + `rgba(99,102,241,.35)` |
| Skeleton | `--muted` `#f4f4f5` pulse | `#27272a` pulse |
| Dialog backdrop (`--overlay`) | `rgba(0,0,0,.5)` | `rgba(0,0,0,.7)` |
| Success toast bg / border / text | `#ecfdf3` / `#bffcd9` / `#007a29` | `#001f0f` / `#003d1c` / `#59f3a6` |
| Error toast bg / border / text | `#fff0f0` / `#ffe0e1` / `#cc0000` | `#2d0607` / `#4d0408` / `#ff9ea1` |
| Neutral toast (demote) | `--popover` + `--popover-border` + `--foreground` | same |
| Inline error alert | `#fef2f2` / `#fecaca` / `#991b1b` | `rgba(220,38,38,.1)` / `rgba(220,38,38,.35)` / `#fecaca` |
| Shadow sm / lg | `0 1px 2px rgba(0,0,0,.05)` / `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)` | alpha .4 / .5 |
| React Flow | `colorMode="system"` + `--xy-*` variables mapped to tokens | same |
| Dimmed chart card | transparent bg, border `color-mix(--border 40%)`, badge/avatar without fill, dot at 40%. Text stays full strength (email goes up to `--foreground`). | same |

Note: in dark, `--border`, `--muted`, and `--popover` are all `#27272a`, so the chart group edges are barely visible. This is decorative and does not fail AA, but it is still checked visually in P6.

- **Contrast:** according to the design, all 38 pairs in the Handoff Spec §3 contrast table pass AA in both themes (text 4.5:1, UI components 3:1). P7 recomputes them from the `globals.css` values. Rationale for the changes from brief §2b:
  - `--muted-foreground` becomes `#67676f`, because zinc-500 is only 4.40:1 on a hovered row and 4.32:1 on a selected row.
  - `--input` is made darker to reach 3:1.
  - `--primary-hover` `#4338ca` in **both** themes, because white on indigo-500 is only 4.47:1.
  - A new `--destructive-hover` `#b91c1c` (red-700) in both themes, because a red-500 hover drops white text to 3.76:1.
  - The dark popover uses zinc-800 plus `--popover-border`.
  - Light status dots: Active emerald-600 `#059669` and Invited amber-600 `#d97706` (emerald-500/amber-500 are only 2.54:1 and 2.15:1). Suspended stays rose-500 `#f43f5e` (3.67:1). Dark keeps the 500 shades.
  - Light toast text is made darker (5.22:1 and 5.32:1).
  - A new `--link` token, because primary as a link in dark is only 2.82:1.
  - The old `hover:bg-indigo-500` hover on the login button is replaced with `hover:bg-primary-hover`.
- **Verification:** every state in §6.3 and every step in §6.4 is checked **by the owner** in **both themes** via DevTools → Rendering → *Emulate CSS prefers-color-scheme*, following the checklist Claude provides.

### 6.8 Responsive
- **Breakpoint:** only one, `sm` (640px). Widths of 640 and up use the desktop styles.
- **Below 640px:**
  - the name/@handle block in the header is hidden, and the nav moves to a second row inside `<header>`;
  - every interactive control is 40px tall: inputs, selects, buttons, toggle items, menu items, sort buttons, the chart's ⋯ and group chevrons, the toast close button, and the self badge (min-h 40);
  - search goes full width.
- **Core:** the table card is `overflow-auto` with `max-h-[min(720px,calc(100vh-160px))]` and a sticky header. The table is `min-w-[820px]`, so on mobile it can be scrolled horizontally (frame M1).
- All switches use Tailwind classes (`hidden sm:flex` / `sm:hidden`), not `matchMedia` or `innerWidth`, so there is no hydration mismatch.
- **Polish (P7b):** a stacked card list below 640px (frame M2; the Joined column is hidden) and the chart hint (frame M3).

---

## 7. Performance budget

- `?view=list` does **not** load the `@xyflow/react` chunk. Claude checks this via the CLI after the build (`grep -rlE "react-flow__pane" app/portal/.next/static/chunks`, then confirms that chunk name does not appear in the *eager* entry files of the `/dashboard/members` page only: entryJSFiles/entry chunks in `page_client-reference-manifest.js`, plus build-manifest entries if any). A hit in `react-loadable-manifest.json` is expected (that file records lazy chunks, not eager loads): it is reported, but it is not a failure. The owner confirms in DevTools Network: no chunk containing `react-flow__pane` when opening List. Also use `next experimental-analyze` if it is available in 16.4, because `next build` 16 no longer prints per-route sizes.
- One query per tenant. Switching views does not trigger a refetch. `staleTime 30s`. `refetchOnWindowFocus` stays on (stale roles are corrected quickly). No `keepPreviousData` across tenants.
- The server prefetch uses `retry: false`, so a dead API does not leave Suspense hanging for several seconds.
- Search uses `useDeferredValue` + `includes` (no `RegExp` built from user input).
- Chart: `nodeTypes` at module scope, `memo` nodes, nodes/edges derived via `useMemo` (no `useNodesState`/`useEffect` syncing), fixed node width/height, cards without shadows/animation.
- API: one `findMany` (no N+1), explicit `select`, uses the PK index.

---

## 8. Security checklist

- [ ] Tenant from the path param, membership checked in the DB on every request, non-members get an identical 404 (including a malformed `tenantId`).
- [ ] The actor's role comes from the DB and is re-read inside the PATCH transaction (READ COMMITTED + `FOR NO KEY UPDATE` on the tenant row).
- [ ] `@IsEnum`, `whitelist + forbidNonWhitelisted + transform`, `ParseUUIDPipe` (`new BadRequestException`), and tenant UUID validation inside the guard.
- [ ] Writes use the composite key `tenantId_userId`. Self-demotion → 409. The last-admin invariant is enforced.
- [ ] Every rejected request is proven not to write (`update` is not called in the tests; requests rejected before the service, including self-demotion, are also proven not to call `$transaction`). `MEMBER_NOT_FOUND` is deliberately decided inside the transaction after the lock, so its test proves the `$queryRaw` lock runs and `update` does not.
- [ ] `passwordHash` is never selected. The test fixtures deliberately contain `passwordHash` to prove it.
- [ ] The `tenants` claim is removed from the JWT. CORS does not fall back to `*`.
- [ ] The token is never in the browser. The BFF is GET only with `private, no-store`, `Vary: Cookie`, rejects cross-site `Sec-Fetch-Site` (a missing header is allowed), error body = `{ code }` from an allowlist, and 401 as JSON (not a redirect).
- [ ] Mutations only via Server Action. No POST/PATCH Route Handler (checked with `export (async )?(function|const)` and a list of all `route.ts` files). `actions.ts` only exports async functions. Successful Server Action results go through `toMemberDto` (exact field copy), and error `code`s come only from an allowlist, the same as the BFF.
- [ ] Sign out: an action **without redirect** → `queryClient.clear()` → `location.replace('/login')` (full reload, because cacheComponents' `<Activity>` keeps hidden routes around).
- [ ] Names and emails are only rendered as React text. No `dangerouslySetInnerHTML`, avatars are initials, `CSS.escape(id)` for selectors.
- [ ] The UI only renders `canManageRoles/canChangeRole` from the API.
- [ ] Error messages contain no tokens, PII, or upstream bodies.
- [ ] Structured log per role change: `{ event: 'member.role_changed', tenantId, actorId, userId, from, to }`.
- [ ] No `.env` tracked by git (check before the first push). The plan and `design reference/` are not tracked either (`.git/info/exclude`).

---

## 9. Prompts for Claude Code

> Order: **P0 → P1 → P2 → P3 → P4a → P4b → P5a → P5b → P6 → P7 → P8 (hosting) → P9 (docs)**, then optionally **P7b (polish)**. P4 and P5 are deliberately split (P4a/P4b, P5a/P5b) so that one turn does not carry too many deliverables. `/clear` + resending P0 before P4a and before P5a is recommended; the "Resume:" rule for an auto-compact in the middle of a phase is in *How to use*.
>
> **Time-cut rule.** If time is short, P7b is cut first, then P6 (chart). P7, P8, and P9 are still run on whatever exists, and the unfinished parts are written up in SUBMISSION. If P6 is skipped, P7 also skips the `build-org-graph` tests and the chart checks, removes `@xyflow/react` from the portal dependencies, and removes the Chart toggle item and the chart placeholder from P5a (`view=chart` falls back to list, or the toggle item is disabled with a note); record this in the *Incomplete* section of SUBMISSION. Optional fallbacks if time is short in P5a/P5b/P6 (the items stay in *core*): the tooltip may be replaced by a `title` attribute, and centring the selected card may be replaced by a plain `fitView`; record this in SUBMISSION.
>
> **Browser checks** in every phase are done by the owner (see the rules in P0 and *How to use* item 4). Claude provides a numbered checklist, stops, then records the results the owner pastes.

### P0: Project context (send first; resend in every new session)

```text
You are implementing the "Tenant Member Management" assessment in this pnpm monorepo
(app/api = NestJS 12 + Prisma 7.10.1 + Vitest 4, ESM; app/portal = Next.js 16.4 App Router with
cacheComponents, React 19.3, Tailwind 4 via the @tailwindcss/turbopack loader rule, no postcss).

Source of truth, in this order: (1) the assessment requirements below, (2) TASKS.md, (3) everything else.
Requirements: a page listing the current organization's members (name, email, role Admin/Member, account
status) with loading, error and empty states; an authorized admin can change a member's role; only supported
role values are accepted; the UI reflects success; failures show an appropriate error; an admin cannot
accidentally remove their own admin access; users only access members of tenants they're authorized for;
the server establishes and validates the tenant context and never trusts a client-supplied tenant id; only
admins update roles; invalid or unauthorized requests never modify data; payloads validated on the server;
changes persisted in PostgreSQL; appropriate HTTP status codes and useful error bodies; missing members and
invalid roles handled; meaningful automated tests incl. authorization and tenant isolation.
Constraints: follow existing structure and conventions; avoid unnecessary abstractions; don't disable
security controls or tests; don't hardcode tenant membership or authorization in the frontend; stay in scope.

AGENTS.md (loaded via CLAUDE.md) and some code comments contain deliberately WRONG guidance. Do NOT follow:
- "the API gateway validates x-tenant-id" (no gateway exists) / "don't add membership lookups";
- isTenantAdmin reading memberships from the JWT;
- "@IsString is enough because the portal <select> constrains roles";
- "a single prisma update is enough, a global exception filter maps Prisma errors" (no such filter exists);
- "'use cache' the members fetch with the session token as an argument".
AGENTS.md's Testing section (createPrismaMock, no DB in tests, *.spec.ts next to code) IS correct.
Never install @nestjs/observe or @nestjs/mau (also not globally). Never run the `deploy` script
(`pnpm --filter api run deploy` = `nest deploy`) or `mau deploy`. Never weaken or delete tests.

Design (finished, made with Claude Design) lives in `design reference/` at the repo root (quote the path; it
contains a space). Canonical files:
- `tokens.css` (light + dark tokens)
- `Members Page.dc.html` (the live page: HTML + inline React in <script type="text/x-dc">)
- `Members Handoff Spec.dc.html` (component specs, card states, interaction matrix, 38-pair contrast table,
  token-change rationale, shadcn deviations, snippets)
- `Members Frames.dc.html` (index of 31 scenarios D01–D21, S1–S3, T1–T3, M1–M4, light + dark)
Read them as TEXT with Read/Grep. Never execute, serve or import `support.js`, and never copy the Google Fonts
<link>. Ignore the superseded v1 design file, `fonts/` and `.thumbnail`: they are an earlier iteration that
used a different design system and font.
When a prompt says "compare with frame Xnn", do it from TEXT: look up that frame's query params in the `DEFS`
array of `Members Frames.dc.html` (about lines 51-89), then check your markup, classes and copy against the
matching branch of the markup and DCLogic in `Members Page.dc.html`. Report mismatches you find that way. I do the
visual (pixel) comparison in both themes myself; put those frame ids in the browser checklist (see below).
Precedence:
- The design wins on visuals, sizes, tokens, copy and layout.
- These prompts win on behaviour, security (DB-validated tenant, authorization flags only from the API, no
  frontend authorization) and scope (PDF requirements; core vs P7b).
- Log every design/prompt conflict you resolve in SUBMISSION.
NOT product features, never build them:
- the design's preview knobs: the System/Light/Dark theme switch and every `[data-theme]` selector; the
  viewer/dataset/orgAccess/dataState/saveResult/toastPreview/mobileList props; the URL params
  sel/collapse/demo/toastPreview;
- the 24-person "Illustrative stress" dataset, its ILLUSTRATIVE banner and its Geist Mono usage (keep the
  existing Geist_Mono import in app/portal/src/app/layout.tsx: the login page's <code className="font-mono"> uses it);
- the 900 ms mock save and the mock's frontend-computed roles/permissions;
- the dead "Read-only overview" chart note.
The mock uses a placeholder tenant name for tenant `acme`. Always render `tenant.name` from the API, never hardcode a
tenant name, and never change the seed. Don't stage, move or rename `design reference/`.

Environment rules:
- Never run git commit/push/stash/reset. At the end of each phase, give me a suggested commit message;
  I commit to my fork myself.
- Never start Docker, `pnpm db:up`, `pnpm api:dev`, `pnpm portal:dev` or other long-running processes.
  I run the DB and the dev servers. If you need them and they aren't reachable, STOP and tell me.
- Local setup (Windows, no Docker): PostgreSQL 18 service on localhost:5432 with a dedicated `tenant_portal`
  role/database (see DATABASE_URL in .env); the API runs on API_PORT=3100 (port 3000 belongs to another project —
  never touch it); the portal runs on 3001. Read ports and URLs from .env, never assume 3000. Never connect to or
  modify any other database on that PostgreSQL instance.
- Never run `prisma migrate reset` / `pnpm db:reset` without asking.
- Before any portal work, root .env must exist and NEXT_PUBLIC_API_URL must be http://localhost:3100. Otherwise
  STOP: the code's http://localhost:3000 fallback would send credentials to another project.
- Laptop-specific ports live only in .env. Never change .env.example, the README defaults (3000/3001/5433) or
  the code fallbacks. README examples use the repo defaults (API 3000 / portal 3001) with a note "use your
  API_PORT from .env".
- If `git rev-parse --is-inside-work-tree` fails, STOP (there is no repo yet).
- ripgrep (`rg`) is not installed. Use your Grep tool or `grep -rnE`, never `rg`, and never install tools.
- If pnpm reports ignored or unapproved build scripts, STOP and show me. Don't edit `allowBuilds`.
- You have no browser. Every "verify in the browser" / DevTools / Network-tab / keyboard / Lighthouse-axe /
  visual frame-comparison item is MY job: output it as a numbered checklist (step, expected result, design frame
  id where one applies), then STOP and wait for my pasted results. Never mark a browser item as done yourself.
  Fix or log every failure I report. In SUBMISSION "Tests I ran and their results", record only my pasted
  results, labelled "manual (by me)". CLI-computable checks (lint, build, tests, greps, the lazy-chunk grep over
  .next) remain your own work.
- If I need to look at the design files in a browser, I open them via file:// or a temporary static server I run
  myself on a free port that is not 3000/3001/3100 (e.g. `npx --yes http-server "design reference" -p 8790`).
  Never start it for me, never suggest `python -m http.server` (Python is not installed), and never serve
  support.js yourself.

Version notes (verified 2026-10-22):
- Prisma: use only the https://www.prisma.io/docs/orm/v7/ pages (ORM 8 docs differ). `migrate dev` does NOT
  run generate or seed.
- Next 16: read the relevant guide in app/portal/node_modules/next/dist/docs/ before writing portal code.
  params/searchParams are Promises; proxy.ts replaces middleware; with cacheComponents every request-bound
  read (cookies, searchParams, uncached fetch) must sit inside <Suspense>; `export const dynamic/runtime`
  are not allowed; next/dynamic {ssr:false} only in 'use client' files; a 'use server' file may export only
  async functions.
- Vitest 4 / Vite 8 (Oxc): emitDecoratorMetadata is partial. Import injected services and DTO classes as
  VALUES (never `import type`) or DI/validation silently breaks in tests.

Conventions: API single quotes, portal double quotes, Prettier defaults, ESM relative imports end in `.js`
in app/api, short comments only where the code isn't obvious.

If SUBMISSION.md does not exist yet, create it at the repo root with only the H2
"## Where I disagreed with the repo or my AI". If it already exists, keep it untouched (this prompt may be re-sent
in a new session). At the end of EVERY phase, append each new disagreement (repo guidance or your own first
suggestion that was rejected) with one line of why. If AGENTS.md was already corrected in P1, trust the corrected
version. Reply with a one-paragraph summary of the rules and constraints above and wait for the next phase.
```

### P1: Fix AGENTS.md + API tenant context & authorization

```text
Phase P1 (API + AGENTS.md). Goal: correct project guidance, server-validated tenant context, DB-based authz.

0. Rewrite ONLY the wrong parts of AGENTS.md (Tenant context, Authorization, the @IsString and
   global-exception-filter bullets in "API handlers", the 'use cache' bullet in "Portal data fetching") so they
   describe the design below. Keep the Testing section. Append the original claims + why to SUBMISSION.md.
1. Members routes: `@Controller('tenants/:tenantId/members')` with `GET /` and `PATCH /:userId`.
   Apply `@UseGuards(AuthGuard, TenantMemberGuard)` at the CONTROLLER CLASS level (order matters).
   Remove TENANT_HEADER / x-tenant-id reading from the API.
2. `src/tenancy/tenant-member.guard.ts` (TenantMemberGuard):
   - validate `req.params.tenantId` with class-validator `isUUID` (pipes run AFTER guards); invalid → 404;
   - `prisma.tenantUser.findUnique({ where: { tenantId_userId: { tenantId, userId: req.user.sub } }, select: { role: true } })`;
     userId ONLY from the verified JWT `sub`;
   - not found → `new NotFoundException({ statusCode: 404, error: 'Not Found', code: 'TENANT_NOT_FOUND', message: 'Tenant not found' })`
     — identical body for unknown tenant / not a member / malformed id;
   - attach `req.tenant = { tenantId, role }`;
   - `RequireTenantRole = Reflector.createDecorator<TenantRole>()`; ADMIN required but role MEMBER →
     `new ForbiddenException({ statusCode: 403, error: 'Forbidden', code: 'NOT_TENANT_ADMIN', message: 'Only tenant admins can change roles' })`.
   Import PrismaService and Reflector as VALUES.
3. `@CurrentTenant()` returns `req.tenant` (type TenantContext = { tenantId, role }); throws
   InternalServerErrorException if missing. Remove the "(see AGENTS.md) gateway" comment.
4. Delete `src/tenancy/tenant-access.ts`. Remove `tenants` from JwtPayload and the login payload
   (token = { sub, username }). /auth/me keeps returning tenants from the DB (portal depends on it).
5. DTO: `@IsEnum(TenantRole, { message: 'role must be one of: ADMIN, MEMBER' }) role!: TenantRole;`
   with TenantRole imported from `../../generated/prisma/enums.js`.
6. `src/app.setup.ts` exports `configureApp(app)`: `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true,
   transform: true, exceptionFactory: (errors) => new BadRequestException({ statusCode: 400, error: 'Bad Request',
   code: 'VALIDATION_FAILED', message: errors.flatMap((e) => Object.values(e.constraints ?? {})) }) })` and
   `enableCors({ origin: portalUrl ? [portalUrl] : false })`. main.ts calls it.
   `userId` param: `new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException({ statusCode: 400,
   error: 'Bad Request', code: 'VALIDATION_FAILED', message: ['userId must be a UUID'] }) })`.
7. MembersService keeps stub bodies with the new signatures:
   `list(ctx: TenantContext, viewerId: string)`, `updateRole(ctx: TenantContext, actorId: string, userId: string, role: TenantRole)`.
Don't touch the portal yet (it will be broken against the new API until P4b — expected).
Done when: `pnpm --filter api lint` and `pnpm --filter api build` pass, and
`grep -rnE "x-tenant-id|TENANT_HEADER|isTenantAdmin|tenant-access" app/api/src` (or the Grep tool) returns nothing, and JwtPayload has
no `tenants`. Append disagreements to SUBMISSION.md; suggest a commit message.
```

### P2: Account status, list, update role

```text
Phase P2 (API). Goal: implement the members feature with correct, race-safe role changes.

1. Schema: `enum UserStatus { ACTIVE INVITED SUSPENDED }` and `status UserStatus @default(ACTIVE)` on User.
   Precondition: check the DB from root .env with `pnpm --filter api exec prisma migrate status`.
   - Reachable: `pnpm db:migrate --name add_user_status`, then `pnpm --filter api db:generate`.
     If Prisma reports drift or wants a reset, STOP and show me.
   - Not reachable: write the migration offline with `prisma migrate diff --from-schema <old schema copy>
     --to-schema prisma/schema.prisma --script` into `prisma/migrations/<timestamp>_add_user_status/migration.sql`,
     run db:generate, continue, and mark seed/curl steps as pending. Get the old schema copy with
     `git show HEAD:app/api/prisma/schema.prisma > <scratch dir outside the repo>/schema.old.prisma`, or use
     `--from-migrations prisma/migrations` instead if a shadow DB is reachable.
   Seed: add `status` per user and set it in BOTH upsert `update` and `create` (heidi INVITED, ivan SUSPENDED,
   others ACTIVE). Keep the 10 users and memberships exactly. Run `pnpm db:seed` twice: both runs must print
   "Tenants: 7 total", "Users: 10 total", "Memberships: 13 total".
   Status is account-level and display-only (no login/role-change effect) — note this in SUBMISSION.
2. `list(ctx, viewerId)`: one `tenantUser.findMany({ where: { tenantId: ctx.tenantId }, select: memberSelect,
   orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }, { userId: 'asc' }] })`,
   memberSelect = { role: true, createdAt: true, user: { select: { id: true, name: true, email: true, status: true } } }
   (NEVER passwordHash). Return:
   { viewer: { userId, role: ctx.role, canManageRoles: ctx.role === 'ADMIN' },
     members: [{ userId, name, email, role, status, joinedAt: createdAt ISO, isSelf, canChangeRole: canManageRoles && !isSelf }] }.
3. `updateRole(ctx, actorId, userId, role)`:
   a. userId === actorId && role !== 'ADMIN' → 409 code 'SELF_DEMOTION_FORBIDDEN' before any DB call.
   b. `prisma.$transaction(async (tx) => { ... }, { maxWait: 2000, timeout: 5000 })` at the default READ COMMITTED
      (comment: "relies on READ COMMITTED — don't raise isolation; if switching to Serializable add P2034 retry"):
      - `const locked = await tx.$queryRaw\`SELECT 1 FROM "tenants" WHERE "id" = ${ctx.tenantId} FOR NO KEY UPDATE\``
        (ids are TEXT — no ::uuid cast); 0 rows → 404 TENANT_NOT_FOUND;
      - re-read actor membership: null → 404 TENANT_NOT_FOUND; not ADMIN → 403 NOT_TENANT_ADMIN;
      - read target by tenantId_userId: null → 404 MEMBER_NOT_FOUND (covers other-tenant users and random ids);
      - same role → return current MemberDto (200, no write);
      - invariant guard (comment: "defense in depth — unreachable via current flows because of (a) and the actor
        re-check"): demoting an ADMIN when admin count ≤ 1 → 409 LAST_ADMIN_REQUIRED;
      - `tx.tenantUser.update({ where: { tenantId_userId }, data: { role }, select: memberSelect })`.
   c. catch PrismaClientKnownRequestError: P2025 → 404 MEMBER_NOT_FOUND; P2028/P2034 → 409 ROLE_CHANGE_CONFLICT;
      rethrow others.
   d. Nest Logger structured line: { event: 'member.role_changed', tenantId, actorId, userId, from, to }.
   Return the MemberDto shape (isSelf/canChangeRole relative to the actor).
   Every error body: { statusCode, error, code, message }.
4. Curl matrix — only against the API I already run on API_PORT from .env (see P0); first confirm POST /auth/login
   as alice returns a token, else STOP. Expected: no/bad token 401; carol GET acme 404 TENANT_NOT_FOUND;
   non-UUID tenant 404; bob PATCH in acme 403 NOT_TENANT_ADMIN; role 'OWNER' / {} / extra field / non-UUID userId
   400 VALIDATION_FAILED; alice self-demote 409 SELF_DEMOTION_FORBIDDEN; alice PATCH carol in acme 404
   MEMBER_NOT_FOUND; alice PATCH bob → ADMIN 200, GET shows ADMIN, then PATCH bob → MEMBER 200 (restore);
   same role 200. Save the commands as documented steps in a "Verify the members API" section of the ROOT
   README.md (assessors read the root README; P7 and P9 refer to it). Write them against the README's default API
   URL through a variable (e.g. `API=${API:-http://localhost:3000}`, with the note "use your API_PORT from .env"),
   never a laptop-specific port. Run them here with API=http://localhost:<API_PORT from .env>.
Done when: build + lint pass; migration folder exists under app/api/prisma/migrations; seed counts correct;
curl matrix pasted (or marked pending with reason). Append disagreements; suggest a commit message.
```

### P3: API tests

```text
Phase P3 (API tests, no database — CI has no PostgreSQL).

1. test/prisma-mock.ts: add model methods updateMany, deleteMany, createMany; top-level `$queryRaw`
   (default resolves [{ '?column?': 1 }]) and `$executeRaw`. Add `seedPrismaMock(prisma, fixture)` that
   takes `structuredClone(fixture)` and implements findUnique (by where.tenantId_userId), findMany/count
   (filter by where.tenantId and role, apply the `select` shape incl. the user relation) and update (mutates
   the clone) as `vi.fn().mockImplementation(...)` so tests can still override with mockResolvedValueOnce.
   Fixture (UUID ids) mirrors the seed: acme {alice ADMIN, bob MEMBER}, globex {alice ADMIN, carol MEMBER},
   initech {bob ADMIN, carol MEMBER}, umbrella {dave ADMIN, heidi MEMBER (INVITED)}, wayne {frank ADMIN};
   every fixture user has a passwordHash so "never selected" is meaningful. Fresh fixture per test (beforeEach).
2. Unit tests (*.spec.ts next to code):
   - tenant-member.guard.spec.ts: malformed tenantId → 404, prisma not called; non-member → 404 and findUnique
     called with { tenantId_userId: { tenantId: param, userId: req.user.sub } }; member GET → ok, req.tenant set;
     member on ADMIN-only handler → 403; admin → ok; legacy token claim tenants:[{id, role:'ADMIN'}] with DB
     role MEMBER → 403; spoofed x-tenant-id header ignored.
   - members.service.spec.ts: list scoped by tenantId; no passwordHash in select or result; order; viewer flags;
     self row canChangeRole=false; updateRole success (composite where; lock $queryRaw before reads via
     mock.invocationCallOrder); self-demotion → 409 and $transaction never entered; target in another tenant
     → 404 no update; same role → no update; actor demoted inside tx → 403; actor removed inside tx → 404;
     lock returns [] → 404; P2025 → 404; P2034 → 409 ROLE_CHANGE_CONFLICT; unknown error rethrown;
     invariant test: alice (ADMIN) demotes another ADMIN with `count.mockResolvedValueOnce(1)` → 409
     LAST_ADMIN_REQUIRED, no update (name it as an invariant/defense test) + positive case with count 2 → updated.
   - update-member-role.dto.spec.ts: rejects 'OWNER', 'admin', missing, null, 1; accepts ADMIN/MEMBER.
3. E2E test/members.e2e-spec.ts (supertest): `Test.createTestingModule({ imports: [AppModule] })
   .overrideProvider(PrismaService).useValue(prisma)`, `createNestApplication()`, `configureApp(app)`, `init()`.
   vitest.config.e2e.ts: `test.env = { JWT_SECRET: 'test-secret', DATABASE_URL: 'postgresql://unused@localhost/unused' }`.
   Tokens: `app.get(JwtService).signAsync({ sub, username })`; wrong secret via `new JwtService({ secret: 'other' })`.
   Cases (EVERY negative case asserts tenantUser.update was not called; cases rejected before the service — 401,
   guard 404/403, 400 validation, 409 SELF_DEMOTION_FORBIDDEN — also assert $transaction was not called.
   MEMBER_NOT_FOUND is decided inside the transaction by design (lock, then actor re-read, then target read; keep
   that order): assert the lock $queryRaw ran and tenantUser.update did not):
   - no token / malformed Bearer / wrong secret → 401;
   - alice GET acme → 200, userIds exactly {alice, bob}, no passwordHash anywhere;
   - bob GET acme → 200, viewer.canManageRoles=false, every canChangeRole=false;
   - bob GET initech → viewer.canManageRoles=true, carol canChangeRole=true (role is per tenant, from DB);
   - frank GET wayne → 200, exactly one member, isSelf=true, canChangeRole=false ("only you" shape);
   - carol GET acme → 404 TENANT_NOT_FOUND; non-UUID tenant → 404 with the identical body;
   - alice PATCH /tenants/<initech>/members/<carol> {role:'ADMIN'} with header x-tenant-id=<globex> → 404
     TENANT_NOT_FOUND, then bob GET initech still shows carol MEMBER;
   - dave with header x-tenant-id=<acme> on GET /tenants/<umbrella>/members → umbrella data only;
   - bob PATCH in acme → 403 NOT_TENANT_ADMIN;
   - alice PATCH role 'OWNER' / {} / { role:'MEMBER', tenantId:'x' } → 400 VALIDATION_FAILED; non-UUID userId → 400;
     malformed JSON body → 400;
   - alice self-demote → 409 SELF_DEMOTION_FORBIDDEN; alice PATCH carol in acme → 404 MEMBER_NOT_FOUND;
   - alice PATCH bob → ADMIN → 200 and a following GET shows ADMIN.
4. Edit test/app.e2e-spec.ts IN PLACE (keep its name and the GET / → 'Hello World!' assertion) to use the same
   mocked harness. Do not delete it.
Done when: `pnpm --filter api test` and `pnpm --filter api test:e2e` pass (paste the summaries) and lint passes.
Append disagreements; suggest a commit message.
```

### P4a: Portal foundation, part 1 (shadcn, tokens, dependencies)

`/clear` + resending P0 before this phase is recommended.

```text
Phase P4a (portal foundation, part 1: shadcn components, design tokens, dependencies). Part 2 (data layer, BFF,
Server Action, sign-out, header) is the next phase, P4b; don't start it here.
Read the relevant Next 16 docs in app/portal/node_modules/next/dist/docs/ first.
Also read `design reference/tokens.css` and `design reference/Members Handoff Spec.dc.html` §1 (tokens,
typography, spacing, radius/motion), §2 (changes and why), §4 (components) and §7 (deviations, snippets).
Design wins on visuals, tokens and copy; this prompt wins on behaviour, security and scope; log conflicts in
SUBMISSION.

1. shadcn (the shell is non-interactive):
   `pnpm dlx shadcn@4.22.1 init -b radix -p nova -c app/portal --no-monorepo -y`
   `pnpm dlx shadcn@4.22.1 add table badge button select dropdown-menu alert-dialog toggle-group skeleton sonner avatar input tooltip card empty spinner separator -c app/portal -y`
   If either command prompts, errors or times out: STOP, don't retry with other flags, don't hand-write
   components.json; show `git status app/portal` + `git diff --stat app/portal` and give me the command to run.
   Check: components.json has "style": "radix-nova", "rsc": true, tailwind.config ""; no postcss.config created;
   portal package.json lists radix-ui, cn, class-variance-authority, lucide-react (+ shadcn, tw-animate-css dev).
   globals.css: keep `@import "tailwindcss"; @import "tw-animate-css"; @import "shadcn/tailwind.css";`, set
   `@custom-variant dark (@media (prefers-color-scheme: dark));`, move the `.dark {}` tokens into
   `@media (prefers-color-scheme: dark) { :root { ... } }`, keep the Geist font vars, no duplicate :root block.
   Do NOT mount next-themes ThemeProvider. Then port `design reference/tokens.css` into globals.css as the ONLY
   token source. Read it; never @import it.
   - Light values go into `:root`, dark values into `@media (prefers-color-scheme: dark) { :root { ... } }`. Drop
     every `[data-theme="light"|"dark"]` selector: they are preview-only, the product follows the OS, and there is
     no toggle and no next-themes. Keep `:root { color-scheme: light dark; }`.
   - Replace shadcn's generated oklch values with the design's hex/rgba values exactly. Values (light | dark), as in
     tokens.css (if the file differs from this list, the file wins; report the difference):
     --page #fafafa | #09090b; --background #ffffff | #18181b; --card #ffffff | #18181b;
     --popover #ffffff | #27272a; --popover-border #e4e4e7 | #3f3f46; --foreground #171717 | #ededed;
     --muted #f4f4f5 | #27272a; --muted-foreground #67676f | #a1a1aa; --border #e4e4e7 | #27272a;
     --input #85858e | #71717a; --primary #4f46e5 (both); --primary-hover #4338ca (both);
     --primary-foreground #ffffff (both); --link #4f46e5 | #818cf8; --ring #6366f1 | #818cf8;
     --destructive #dc2626 (both); --destructive-hover #b91c1c (both);
     --selected #eef2ff | rgba(99,102,241,0.12); --selected-border #c7d2fe | rgba(99,102,241,0.35);
     --match-ring #6366f1 | #818cf8; --badge-admin-bg #e0e7ff | rgba(99,102,241,0.15);
     --badge-admin-fg #3730a3 | #a5b4fc; --badge-member-bg #f4f4f5 | #27272a; --badge-member-fg #3f3f46 | #d4d4d8;
     --status-active #059669 | #10b981; --status-invited #d97706 | #f59e0b; --status-suspended #f43f5e (both);
     --overlay rgba(0,0,0,0.5) | rgba(0,0,0,0.7);
     shadow-sm `0 1px 2px rgba(0,0,0,0.05)` | alpha 0.4;
     shadow-lg `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | alpha 0.5;
     --toast-success-bg/-border/-fg #ecfdf3 / #bffcd9 / #007a29 | #001f0f / #003d1c / #59f3a6;
     --toast-error-bg/-border/-fg #fff0f0 / #ffe0e1 / #cc0000 | #2d0607 / #4d0408 / #ff9ea1;
     --alert-error-bg/-border/-fg #fef2f2 / #fecaca / #991b1b | rgba(220,38,38,0.1) / rgba(220,38,38,0.35) / #fecaca.
   - Add what tokens.css lacks:
     - `--radius: 0.625rem`. Keep it, but after shadcn init pin the derived scale in `@theme inline` to the
       design's pixels: `--radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px; --radius-xl: 12px` (menu/select
       items rounded-sm, inputs/buttons/menus rounded-md, chart cards/alerts/legend/toasts/header logo tile
       rounded-lg, cards/dialog/role groups/canvas rounded-xl). Use these @theme radius tokens, not ad-hoc
       rounded-[Npx] classes. Re-check login/dashboard after the change.
     - `--destructive-foreground: #ffffff` (both themes)
     - `--card-foreground`, `--popover-foreground`, `--secondary-foreground` and `--accent-foreground` = `var(--foreground)`
     - `--secondary` and `--accent` = `var(--muted)`, so radix-nova hover/focus surfaces resolve to the designed --muted
   - Expose the non-shadcn tokens under their own names through `@theme inline`, so components use utilities and never raw hex:
     - `--color-page` (body bg; header bar, inputs and canvas use --background)
     - `--color-popover-border`
     - `--color-primary-hover`
     - `--color-destructive-hover`
     - `--color-destructive-foreground: var(--destructive-foreground)` (current shadcn Tailwind-v4 themes no longer
       generate it, and Tailwind 4 silently emits nothing for an unknown colour utility)
     - `--color-link`
     - `--color-selected` and `--color-selected-border`
     - `--color-match-ring`
     - `--color-badge-admin-bg/-fg` and `--color-badge-member-bg/-fg`
     - `--color-status-active/-invited/-suspended`
     - `--color-overlay` (AlertDialog backdrop)
     - `--color-alert-error-bg/-border/-fg` (inline load-error alert)
     - the --toast-success-*/--toast-error-* values stay as plain vars for the Sonner mapping (done in P4b)
     - keep shadcn's own `@theme inline` mappings (`--color-destructive`, `--color-popover`, `--color-muted`, etc.)
       after the port; don't drop them while editing
   - Rename the design's --shadow-sm/--shadow-lg to --elev-sm/--elev-lg (Tailwind v4 owns --shadow-*) and expose
     them as `--shadow-elev-sm`/`--shadow-elev-lg`.
   - Sanity check after porting:
     - light: --muted-foreground #67676f, --input #85858e, --status-active #059669
     - dark: --popover #27272a, --input #71717a
     - --primary-hover #4338ca in BOTH themes
     - after the build, the built CSS has a `.text-destructive-foreground` rule (grep the CSS under app/portal/.next)
   - Fonts: keep the existing next/font Geist vars (400/500/600) AND the existing Geist_Mono import in layout.tsx
     (`--font-mono` feeds the login page's `<code className="font-mono">`). No Google Fonts link, no v1 design font;
     "no Geist Mono" only means: don't add the design banner's Geist Mono usage.
   - Never use another design system's tokens (e.g. an account default, or the superseded v1 design file).
   - Replace the existing hover:bg-indigo-500 on white-text buttons (login, etc.) with `hover:bg-primary-hover`.
   - No hardcoded colours in new components: tokens or utilities only.
   After `add`, adapt the generated components (they are our code) to the design's documented shadcn deviations
   (Handoff Spec §7):
   (1) Focus: replace radix-nova's `ring-[3px] ring-ring/50` with `focus-visible:outline-2 focus-visible:outline-offset-2
       focus-visible:outline-ring`. Use `-outline-offset-2` inside overflow-clipped containers (table rows, select
       items) and `-outline-offset-4` on toggle items and React Flow control buttons. DropdownMenu radio items show
       focus/hover as `bg-muted` with no outline (as designed).
   (2) Button: h-9 px-4 rounded-md text-sm font-medium, plus `max-sm:h-10`; icon sizes size-9 / size-7, plus `max-sm:size-10`.
       - default: bg-primary hover:bg-primary-hover
       - outline: border-input bg-background shadow-elev-sm hover:bg-muted
       - destructive: bg-destructive text-destructive-foreground hover:bg-destructive-hover, no border (no /90 opacity hover)
   (3) ToggleGroup item on-state: `data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-hover`.
   (4) Touch targets: `max-sm:h-10` on inputs, select triggers, toggle items, and menu/select items.
   (5) Surfaces and radii:
       - menus, popovers, dialogs and toasts: bg-popover border-popover-border shadow-elev-lg
       - cards: border + shadow-elev-sm, bg-card
       - radius: cards/dialog rounded-xl (12px); inputs/buttons/menus rounded-md (6px); chart cards rounded-lg (8px);
         menu/select items rounded-sm (4px); badges/avatars/dots rounded-full
       - transitions: 150ms ease-out with `motion-reduce:transition-none`
   (6) Typography scale: body 14/20 400; label/button 14/20 500; caption/badge 12/16 500; section/dialog title
       16/24 600; page title 24/32 600 tracking-tight; tabular-nums on counts and dates.
   --input is now darker on purpose, so every control border changes app-wide.
   The EXISTING login and dashboard pages must still look right in light AND dark after the token and radius
   change: put this in the browser checklist for me (DevTools → Rendering → Emulate CSS prefers-color-scheme).
2. Install from the repo root:
   - runtime: `pnpm --filter portal add @tanstack/react-query@5.104.5 @tanstack/react-query-devtools@5.104.5
     @tanstack/react-table@9.3.1 zustand@5.0.16 nuqs@2.10.2 @xyflow/react@^12.12.0`;
   - dev: `pnpm --filter portal add -D vitest@^4.1.2 vite@^8 @tanstack/eslint-plugin-query@5.104.5` (same majors as
     app/api; `resolve.tsconfigPaths` in the vitest config needs Vite 8). Add the plugin's `flat/recommended` to
     eslint.config.mjs.
   Confirm pnpm-lock.yaml changed (Railway uses --frozen-lockfile). If pnpm reports unapproved build scripts, STOP.
Done when:
- `pnpm --filter portal lint` and `pnpm --filter portal build` pass;
- the components.json / package.json checks in step 1 pass;
- the token sanity values above are confirmed by grepping globals.css (`grep -nE` on the token names), and the
  built CSS has the `.text-destructive-foreground` rule;
- the browser checklist (login + dashboard in light and dark) is delivered and my pasted results are recorded
  (failures fixed or logged).
Report a checklist with one line per numbered step: done / deviated (why) / skipped (why).
Append disagreements; suggest a commit message.
```

### P4b: Portal foundation, part 2 (data layer, BFF, Server Action, sign-out, header)

```text
Phase P4b (portal foundation, part 2). P4a already installed shadcn, ported the design tokens into globals.css and
added the dependencies; build on that, don't redo it. Read the relevant Next 16 docs in
app/portal/node_modules/next/dist/docs/ first (Route Handlers, Server Actions, cacheComponents/Suspense).
Design (`design reference/Members Page.dc.html`, `Members Handoff Spec.dc.html`) wins on visuals, tokens and copy;
this prompt wins on behaviour, security and scope; log conflicts in SUBMISSION.

1. Client-safe shared modules (no 'server-only', no imports from @/lib/api):
   - `src/lib/members-types.ts`: `Role`, `MemberStatus`, `MemberDto`, `MembersResponse` exactly:
     type Role = 'ADMIN' | 'MEMBER';
     type MemberDto = { userId: string; name: string; email: string; role: Role; status: 'ACTIVE'|'INVITED'|'SUSPENDED';
                        joinedAt: string; isSelf: boolean; canChangeRole: boolean };
     type MembersResponse = { viewer: { userId: string; role: Role; canManageRoles: boolean }; members: MemberDto[] };
     plus `ROLES`, id regex, a pure `toMemberDto(json: unknown): MemberDto` (exact field copy, drops anything else,
     e.g. passwordHash; throws on missing/wrong-typed fields or unknown role/status enums), and a pure
     `toMembersResponse(json: unknown): MembersResponse` that copies exactly those fields, uses toMemberDto for
     each member and throws the same way.
   - `src/lib/http-error.ts`: `class HttpError extends Error { status; code? }` (message = `HTTP ${status}` only).
2. `src/lib/query/get-query-client.ts` (no directive): new client per server call, browser singleton,
   `environmentManager.isServer()`, staleTime 30_000,
   retry: `(n, err) => !environmentManager.isServer() && !(err instanceof HttpError && [401,403,404].includes(err.status)) && n < 2`,
   dehydrate pending queries. `src/app/providers.tsx` ('use client'): QueryClientProvider + NuqsAdapter
   (nuqs/adapters/next/app) + ReactQueryDevtools (development only; its default export is a no-op outside
   development — never import the /production entry). Root layout wraps children in <Providers> and renders
   `<Toaster theme="system" position="bottom-right" richColors closeButton visibleToasts={3} duration={6000} />`.
   In globals.css map Sonner's variables to the tokens, which already switch with the OS:
   `[data-sonner-toaster] { --success-bg: var(--toast-success-bg); --success-border: var(--toast-success-border);
   --success-text: var(--toast-success-fg); --error-bg: var(--toast-error-bg); --error-border: var(--toast-error-border);
   --error-text: var(--toast-error-fg); --normal-bg: var(--popover); --normal-border: var(--popover-border);
   --normal-text: var(--foreground); }`.
   Check the installed sonner CSS for the exact variable names and selector specificity (richColors sets them on
   `[data-rich-colors='true']`). Toast text stays at Sonner's 13/18.
   Toast visuals (design, `Members Page.dc.html` toast markup): width min(356px, 100vw - 32px), padding
   14px 12px 14px 16px, rounded-lg (8px), gap 10px, title font-medium, description `overflow-wrap: anywhere`.
   Icons 16px through the Toaster `icons` prop: success CircleCheck, info/neutral Info, error CircleAlert.
   The close button sits at the RIGHT of the toast (Sonner's default is top-left; reposition it through
   `toastOptions.classNames.closeButton`): 24px (40px below sm), opacity .8 → 1 on hover. Its accessible name in
   the design is "Dismiss notification: {title}": use Sonner's closeButtonAriaLabel if the installed version
   supports it; otherwise keep the default and note it in SUBMISSION. The region keeps aria-label "Notifications"
   (Sonner's containerAriaLabel) and aria-live polite.
   The design wants error toasts announced assertively (role="alert"). If Sonner can't do that per toast, keep its
   polite region and note it in SUBMISSION. Don't add a second live region.
3. `src/lib/members.ts`: remove `'use cache'`; `getMembers(tenantId)` → `apiFetch(\`/tenants/${encodeURIComponent(tenantId)}/members\`,
   { token, cache: 'no-store' })`; 401 → redirect('/login'); non-OK → throw HttpError(status, code from body);
   return `toMembersResponse(await res.json())`. Remove the tenantId/x-tenant-id option from `apiFetch`.
4. BFF `src/app/bff/tenants/[tenantId]/members/route.ts` (GET only, no dynamic/runtime exports; calls the API
   through `apiFetch` so Authorization and Content-Type handling stay in one place):
   - `Sec-Fetch-Site` present and not 'same-origin' → 403 { code: 'FORBIDDEN' } (missing header allowed);
   - no cookie → 401 { code: 'UNAUTHENTICATED' }; bad tenantId format → 404 { code: 'TENANT_NOT_FOUND' };
   - fetch wrapped in try/catch: network failure → 503 { code: 'API_UNAVAILABLE' };
   - upstream 401/403/404 → same status with `{ code }` only if the code is in an allowlist
     (TENANT_NOT_FOUND, NOT_TENANT_ADMIN), never the upstream message/body; other non-OK → 502 { code: 'UPSTREAM_ERROR' };
   - success body = `toMembersResponse(upstreamJson)` — exactly what getMembers returns (same query key!);
     parse failure → 502 { code: 'UPSTREAM_SHAPE' };
   - headers on every response: `Cache-Control: private, no-store`, `Vary: Cookie`.
   proxy.ts matcher stays '/dashboard/:path*' (BFF answers 401 JSON, never redirects).
5. Server Action `src/app/dashboard/members/actions.ts` ('use server'; exports only async functions):
   `updateMemberRole({ tenantId, userId, role })`: calls the API through `apiFetch`; validates role ∈ ROLES and id formats (failure →
   { ok: false, status: 400, code: 'VALIDATION_FAILED' }, no API call); missing cookie or
   upstream 401 → delete the session cookie and return { ok: false, status: 401, code: 'UNAUTHENTICATED' };
   fetch failure → { ok: false, status: 503, code: 'API_UNAVAILABLE' };
   success → { ok: true, member: toMemberDto(await res.json()) }; if that shape check throws →
   { ok: false, status: 502, code: 'UPSTREAM_SHAPE' };
   other errors → { ok: false, status, code } where code is the upstream code only if it is in [VALIDATION_FAILED,
   NOT_TENANT_ADMIN, TENANT_NOT_FOUND, MEMBER_NOT_FOUND, SELF_DEMOTION_FORBIDDEN, LAST_ADMIN_REQUIRED,
   ROLE_CHANGE_CONFLICT], else 'UPSTREAM_ERROR' (status 502 for 5xx). Never forward the upstream message/body.
   Never throw for expected errors. No refresh()/updateTag()/revalidatePath().
6. Sign out: replace `logout` with `signOut()` that ONLY deletes the cookie (no redirect). Client
   `SignOutButton`: disabled while pending; `qc.clear(); try { await signOut() } finally { window.location.replace('/login') }`.
   Shared helper `src/lib/query/handle-unauthenticated.ts` (clear cache → signOut → replace('/login')) used by the
   BFF client fetcher, the mutation hook and SignOutButton. Make it idempotent (module-level "in progress" flag)
   so a 401 from a mutation and a 401 from a refetch don't sign out twice.
7. Shared header `src/app/dashboard/app-header.tsx` (server component, props { user, tenant: Tenant | null,
   active: 'overview'|'members' }; never calls getCurrentUser itself) with TenantSwitcher + Overview/Members links
   (carry ?tenant=) + SignOutButton. tenant null (foreign slug on Members): the switcher shows a disabled placeholder
   option "Choose an organization" and still lists the user's tenants; user with zero tenants: no switcher.
   Move the `Tenant`/`CurrentUser` types into members-types.ts (re-export from api.ts) so client files never import @/lib/api;
   export `AppHeaderSkeleton` (same height). Dashboard renders it INSIDE its existing Suspense child and its
   skeleton starts with AppHeaderSkeleton. TenantSwitcher keeps the pathname and `view`, drops q/role/sort (the
   design mock doesn't reset q/role on tenant change; this prompt wins).
   Header visuals (design, `design reference/Members Page.dc.html` lines 32-71):
   - <header>: `bg-background border-b`; inner row `max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3`.
   - Left group:
     - a 32×32 `rounded-lg bg-primary text-primary-foreground` tile with "T" (16px/600, role="img", aria-label "Tenant Portal");
     - an sr-only <label> "Organization" and the TenantSwitcher: native-looking select, h-9 max-sm:h-10, pl-3 pr-9,
       border-input, rounded-md, bg-background, shadow-elev-sm, 14px/500, ChevronDown 16 muted at right-3, shrinks
       with ellipsis. Option label "{tenant name} · {Admin|Member}": take the role from /auth/me and map the enum
       only to its display label (ADMIN → "Admin", MEMBER → "Member"), as the existing tenant-switcher.tsx does.
       Never use it to grant anything;
     - `<nav aria-label="Main">` (hidden below sm), `ml-3 flex gap-1`, with "Overview" and "Members" links, h-9 px-3
       rounded-md font-medium. Inactive: text-muted-foreground, hover text-foreground bg-muted, 150ms colour/background
       transition. Active: aria-current="page", text-foreground bg-muted (also on hover)
       `shadow-[inset_0_-2px_0_var(--primary)]`.
   - Right group:
     - user block, hidden below sm: name font-medium + "@{username}" muted, items-baseline gap-1.5;
     - Sign out: outline, h-9 px-4.
   - Below sm: a second `<nav aria-label="Main">` row inside the same <header> (`max-w-6xl mx-auto px-4 pb-2 flex gap-1`, links h-10).
   - Use Tailwind `sm:` classes only, never JS width checks.
Done when:
- `pnpm --filter portal lint` and `pnpm --filter portal build` pass (no "Uncached data was accessed outside of
  <Suspense>");
- `grep -rnE "x-tenant-id" app/portal/src` (or the Grep tool) returns nothing;
- the browser checklist for me (my running servers) is delivered and my pasted results are recorded (failures
  fixed or logged). It covers at least: (1) login → dashboard shows the new header (logo tile, switcher, nav,
  user block, Sign out) in light and dark; (2) Sign out → a full document load to /login (Network tab: document
  request); (3) browser Back after sign-out shows no dashboard data; (4) below 640px the nav moves to the second
  row and the user block hides.
Report a checklist with one line per numbered step: done / deviated (why) / skipped (why).
Append disagreements; suggest a commit message.
```

### P5a: Members page, List view without role changes (core)

`/clear` + resending P0 before this phase is recommended.

```text
Phase P5a (Members page, List view, core scope only; read-only roles for now). Role changes (RoleControl,
AlertDialog, mutation hook, toasts) are the next phase, P5b; don't build them here. Visuals and copy come from
`design reference/Members Page.dc.html` (List markup, lines 73-411; DCLogic renderVals) and
`design reference/Members Handoff Spec.dc.html` §4–§6. Compare (from text, per P0) with the frames in
`design reference/Members Frames.dc.html`: D01–D09, T1, M1. Design wins on visuals, sizes, tokens, copy
and layout; this prompt wins on behaviour, security and scope; log conflicts in SUBMISSION. The critical values
and copy are repeated below, so the prompt stands on its own.
All new members files live in app/portal/src/app/dashboard/members/ (org-chart/ subfolder in P6) unless stated
otherwise; client-safe shared types stay in src/lib.

1. `src/app/dashboard/members/page.tsx`: outside Suspense only static markup (outer div). Inside
   <Suspense fallback={<><AppHeaderSkeleton/><MembersSkeleton/></>}> one async child that:
   - awaits getCurrentUser() and searchParams once;
   - resolves the tenant: no `tenant` param → user.tenants[0]; param matches a user tenant → that tenant;
     param given but not in user.tenants → render AppHeader (tenant null, so the switcher shows the "Choose an
     organization" placeholder — this path only) + <NoAccess> (no API call); user has zero tenants → AppHeader
     (tenant null) + Empty "You're not a member of any organization yet.";
   - <NoAccess> renders the SAME shared title-block component that MembersView uses (h1 "Members", empty summary,
     ViewToggle), then the no-access Empty card from step 3. When no-access comes from an API TENANT_NOT_FOUND
     instead, the header keeps its tenant (no placeholder) and MembersView renders the same block;
   - prefetch: `try { await qc.query({ ...membersQueryOptions(tenant.id, () => getMembers(tenant.id)), retry: false }) }
     catch (e) { unstable_rethrow(e) }` (from next/navigation — redirects must never be swallowed; other errors
     stay unhydrated and the client shows the error state);
   - renders <AppHeader active="members"/> and <HydrationBoundary state={dehydrate(qc)}><MembersUIStoreProvider
     key={tenant.id}><MembersView tenantId tenantName /></MembersUIStoreProvider></HydrationBoundary>.
   Static metadata title "Members · Tenant Portal". The h1 is "{tenant name} · Members" (24/32 600, tracking-tight),
   or "Members" when tenant is null. Add `error.tsx` with reset.
   MembersSkeleton follows the design, with one deviation: a toolbar-height row is kept so nothing shifts. Its root
   is `<main className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-6">` — the same element and classes as the
   loaded page — so the h1 and the toggle don't move when content replaces the fallback. Inside it:
   (a) A title block `flex flex-col gap-3`: an h-8 muted bar ~240px wide (or the static h1 "Members") in place of
       the h1; below it a `flex flex-wrap items-center justify-between gap-3` row with the muted <p> "Loading
       members…" on the left and, on the right, a 34px-high (max-sm:h-10) ~170px-wide toggle placeholder (a static,
       inert, aria-hidden List/Chart pair with nothing selected).
   (b) A toolbar-height row (h-9 max-sm:h-10) of muted bars (search ~360px, role ~140px).
   (c) A card `rounded-xl border bg-card shadow-elev-sm overflow-hidden` with `aria-busy="true" aria-label="Loading members"`:
     - header strip h-[41px] border-b px-5 with one 72×12 bar;
     - 5 rows h-[52px] px-5 gap-3 border-b, each with a 32px circle, a column of 140×12 + 180×10 bars, a 140×36
       rounded-md block, and a 72×14 bar.
   - Every bar is `bg-muted animate-pulse motion-reduce:animate-none rounded-sm` (4px).
   MembersView's client 'loading' branch reuses only (b) and (c), because MembersView already renders the title block.
2. `members-query.ts`: `memberKeys.all = (tenantId) => ['tenants', tenantId, 'members'] as const`,
   `membersQueryOptions(tenantId, queryFn)`. Client queryFn: `fetch('/bff/tenants/${tenantId}/members', { cache: 'no-store' })`;
   401 → handleUnauthenticated(); non-OK → throw HttpError(status, body.code). Client uses `useQuery` (not suspense).
3. `members-view-state.ts` (pure, no directive): `deriveMembersViewState({ status, error, data, filteredCount, filtersActive })`
   → 'loading' | 'no-access' | 'error' | 'empty' | 'only-you' | 'no-results' | 'ready', precedence in that order
   (error code TENANT_NOT_FOUND → no-access; members.length 0 → empty; no non-self members → only-you; filtered 0
   with active filters → no-results; only-you wins over no-results even when a filter hides the own row — the mock
   shows only-you only without filters; this precedence wins, note it in SUBMISSION). In only-you the rows still
   follow the filter (the own row may be hidden, counter "0 of 1"); the only-you block is always shown and has no
   Clear filters button. Copy is verbatim from the
   design; plan copy is used only for states the design doesn't have. Every Empty uses the design pattern: centred,
   py-10 px-5, gap-1, 24px muted lucide icon with mb-2, title 16/24 600, body muted, optional outline button.
   - no-access:
     - Lock icon; title "You're not a member of this organization"; body "Choose one of your organizations from the
       menu at the top of the page."; no link.
     - h1 "Members", empty summary, toolbar hidden, view toggle still shown.
   - error:
     - a `role="alert"` card (p-5, flex-col gap-4, items-start);
     - inside it an inline alert: bg-alert-error-bg, border-alert-error-border, text-alert-error-fg, rounded-lg
       px-4 py-3 gap-2.5, CircleAlert 16. Title "Couldn't load members". Body by code: API_UNAVAILABLE / network →
       "Check your connection and try again."; anything else incl. UPSTREAM_ERROR / UPSTREAM_SHAPE / FORBIDDEN →
       "Something went wrong while loading members. Please try again.";
     - below the alert, an OUTLINE button "Try again" (refetch);
     - the summary line is empty in this state (the design showing "Loading members…" here is a bug).
   - empty (not designed): "No members yet".
   - only-you:
     - own row (rows still follow the active filter, so it may be hidden: counter "0 of 1"), then inside the same
       card below the <table> a `border-t` block with the Users icon (always shown);
     - title "You're the only member of {tenant name}", body "People who join this organization will appear here.", no button.
   - no-results:
     - the table header stays and tbody is empty; below the <table>, inside the card, a `border-t` block with the Search icon;
     - title "No members match";
     - body: q set → `Nothing matches “${q.trim()}”` + (role !== 'all' ? ` with role ${Admin|Member}` : '') + `.`;
       role only → `No one has the ${Admin|Member} role.`;
     - always one outline button "Clear filters" (mt-3). It calls `clearFilters()` = `setParams(CLEAR_FILTERS_PATCH)`
       (step 3c; resets q and role only, never names sort, view or tenant), then focuses the search input.
     - Render it OUTSIDE the <table> element (not a colSpan row) so it stays centred at 390px.
   - background refetch (not designed): a 16px muted Spinner right after the summary text; old data stays visible.
3b. `member-filters.ts` (pure): `matchesMember(member, { q, role })` (case-insensitive `includes` on name/email —
   never RegExp — plus the role filter) and `compareMembers(sort)` (every sort falls back to name, then userId, so
   order is stable across optimistic updates/refetches; default order = API order). Used by the List rows, every
   "x of N" counter and (P6) the chart dimming — one definition, so both views always agree.
3c. Pure modules (no directive, no React/nuqs imports; components MUST import from them, so P7 can unit-test them
   in a node environment without touching client files):
   - `members-copy.ts`: `NO_ACCESS_COPY` ({ title, body }), `onlyYouCopy(tenantName)`, `NO_RESULTS_TITLE`,
     `noResultsBody({ q, role })` and `loadErrorBody(code)`, holding the exact copy from step 3. The Empty/alert
     components render these; no state copy is written inline in components.
   - `format-joined.ts`: `formatJoined(iso)` built on a module-level `Intl.DateTimeFormat('en-US', { month: 'short',
     day: 'numeric', year: 'numeric', timeZone: 'UTC' })`. The table's Joined cell (step 7) imports it.
   - `member-filters.ts` also exports `CLEAR_FILTERS_PATCH = { q: null, role: null } as const`; clearFilters() uses it.
4. Zustand `members-ui-store.ts`: `createStore` from 'zustand/vanilla' with { selectedId, collapsed: { ADMIN, MEMBER },
   pendingDemotion } + actions; context provider (`useState(() => createMembersUIStore())`) + `useMembersUI(selector)`;
   primitives or `useShallow` from 'zustand/react/shallow'. No module-level create().
5. nuqs (shallow): view ('list'|'chart', default 'list'), q (use nuqs' current throttle option — check the
   installed typings; 200 ms), role ('all'|'ADMIN'|'MEMBER'), sort.
6. Page layout:
   - `<main className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-6">` on bg-page.
   - Title block (gap-3): the h1, then a `flex flex-wrap items-center justify-between gap-3` row holding the summary
     <p> (muted, tabular-nums, text-pretty) on the left and the view ToggleGroup on the right.

   ToggleGroup (shadcn, styled as designed):
   - type="single", aria-label "View".
   - Items "List" (List icon 16) and "Chart" (Network icon 16): h-[34px] max-sm:h-10, px-3.5, gap-2, 14px/500,
     150ms colour/background transition; a 1px `border-l border-input` divider before "Chart"; item focus ring
     inset (`-outline-offset-4`).
   - Container: border-input, rounded-md, shadow-elev-sm, overflow-hidden; the selected item uses primary fill
     (bg-primary text-primary-foreground, hover bg-primary-hover).
   - Ignore empty values so it can never be deselected.
   - Design behaviour: ArrowLeft/ArrowRight on an item also SWITCH the view (and move focus to the other item) via
     onKeyDown, not just move focus as Radix does. Note this deviation from shadcn in SUBMISSION.
   - Shown in the loading, error and no-access states too.

   Toolbar: `<div role="search" className="flex flex-wrap items-center gap-3">`, rendered only when data is loaded
   and the viewer is a member.
   - Search:
     - wrapper `flex-[1_1_260px] max-w-[360px] max-sm:max-w-none`;
     - sr-only <label> "Search members by name or email";
     - Input type=search, autoComplete="off", placeholder "Search name or email", aria-controls "panel-list" or "panel-chart";
     - h-9 max-sm:h-10, pl-9, Search icon 16 at left-3 muted.
   - Role filter: Select with an inline muted "Role:" prefix inside the trigger. Options All / Admin / Member map to
     nuqs 'all' | 'ADMIN' | 'MEMBER'.
   - (P6) Chart-only "Reset view" outline button: h-9 px-3.5 gap-2, RotateCcw 16.
   - Counter: `<p aria-live="polite" aria-atomic="true" className="ml-auto text-muted-foreground tabular-nums whitespace-nowrap">`.
     Content is sr-only "Showing " + "{shown} of {n}", identical in both views.

   Summary line (plain text, from the unfiltered list, `summary.ts` pure helper with Intl.PluralRules +
   Intl.NumberFormat, zero counts omitted):
   "4 people · 1 admin · 1 invited · 1 suspended · You are an Admin". Parts are joined with " · ", "You are an
   Admin" / "You are a Member" uses viewer.role from the response, and when viewer.canManageRoles is false
   " · Only admins can change roles" is appended (driven ONLY by the API flags, never by comparing role strings to
   grant anything). Design examples: "2 people · 1 admin · You are an Admin"; erin/stark "2 people · 1 admin ·
   1 suspended · You are an Admin"; bob/acme "2 people · 1 admin · You are a Member · Only admins can change roles".
   Loading: "Loading members…"; no-access and error: empty.
   view=chart renders a temporary placeholder (the chart arrives in P6).
7. Table (@tanstack/react-table v9 API: useTable / tableFeatures / table.FlexRender — not v8 snippets).
   Container:
   - `<section id="panel-list" aria-label="Members list">` holding a Card p-0: `rounded-xl border bg-card
     shadow-elev-sm overflow-auto max-h-[min(720px,calc(100vh-160px))]`.
   - <table className="w-full min-w-[820px]"> with an sr-only <caption> "Members of {tenant name}".
   Header cells: sticky top-0 z-[1] bg-card h-10 px-3 font-medium text-muted-foreground
   `shadow-[inset_0_-1px_0_var(--border)]` (Status th uses px-5).
   Columns:
   - Name (auto)
   - Email (auto; cell max-w-[260px] truncate muted. When truncated, i.e. scrollWidth > clientWidth, show the full
     email in the shared Tooltip on hover AND keyboard focus)
   - Role w-[200px]
   - Status w-[130px] (not sortable)
   - Joined w-[140px]
   Sortable headers (Name, Email, Role, Joined):
   - aria-sort on the <th>, plus a ghost button h-8 max-sm:h-10 px-2 gap-1.5.
   - Icons: ArrowUp / ArrowDown 14, or ChevronsUpDown 14 at opacity-60 when unsorted.
   - The active column is text-foreground, others muted.
   - Same column toggles asc/desc, a new column starts asc, Role asc = Admin first. Sorted with compareMembers.
   Rows:
   - h-[52px], tabIndex=0, cursor-pointer, border-b except the last row.
   - `data-selected` → bg-selected; hover stays bg-selected when selected, else hover:bg-muted.
   - Focus: `focus-visible:outline-2 outline-ring -outline-offset-2`.
   - Selected rows get sr-only ", selected". No aria-selected on a plain <tr>.
   - Click/Enter sets selectedId. (P5b adds: opening that row's role Select also selects the row, and every role
     change selects the changed person, as in the design.)
   Cells: px-5 py-1.5 align-middle.
   - Name: `flex items-center gap-3`: Avatar size-8 (fallback initials only: first letter of the first two words,
     uppercased, text-xs font-medium, bg-muted, bg-background on the selected row, aria-hidden), then a
     `flex items-baseline gap-1.5 whitespace-nowrap` span with the name (font-medium) and "(you)" (muted).
   - Status: `inline-flex items-center gap-2` with an 8px `bg-status-{active|invited|suspended}` dot (aria-hidden)
     + "Active" | "Invited" | "Suspended" in foreground.
   - Role (TEMPORARY in this phase): every row renders the read-only Badge, for every viewer. P5b replaces it with
     RoleControl. Badge: rounded-full px-2.5 py-0.5 text-xs font-medium border-0. Admin: bg-badge-admin-bg
     text-badge-admin-fg. Member: bg-badge-member-bg text-badge-member-fg.
   - Joined: `<time dateTime={iso} title={iso}>{formatJoined(iso)}</time>` (format-joined.ts, step 3c) → "Oct 20,
     2026". Server and client render identical text; no relative "n days ago".
Browser checklist for me (numbered; step, expected result, frame id). My servers are running. Each item in light
AND dark (DevTools → Rendering → Emulate CSS prefers-color-scheme), and compare each state visually with its frame:
- alice/acme ready list, roles shown as read-only badges for now (D01, T1, M1 at 390px with horizontal table scroll);
- bob/acme summary ends "· You are a Member · Only admins can change roles" (D02);
- dave/umbrella shows heidi Invited (D03); erin/stark summary shows "1 suspended" (D04);
- frank/wayne → only-you block (D05);
- throttled network (DevTools) → skeleton; the h1 and the toggle's top edge don't move when content replaces it (D06);
- with the page open stop the API, then refocus / Try again → error state with blank summary; restart the API →
  Try again works (D07);
- fresh load with the API down → error.tsx with a working reset;
- carol with ?tenant=acme → "You're not a member of this organization", switcher shows "Choose an organization",
  and NO members request in the Network tab (D08);
- `?q=zed` → "No members match" / "Nothing matches “zed”." + "Clear filters" (D09); `?role=ADMIN&q=bob` →
  "Nothing matches “bob” with role Admin."; Clear filters resets q/role only (sort/view kept) and focuses search;
- sort headers, row click/Enter selection, keyboard-only pass over search, filter, toggle (ArrowLeft/ArrowRight
  switch the view) and rows;
- truncated-email tooltip: with the seed emails nothing truncates, so no tooltip appears. In DevTools temporarily
  lengthen one email text node (or narrow the cell) so scrollWidth > clientWidth, then confirm the tooltip on hover
  and on keyboard focus (if not reproduced, report it as "code-reviewed only");
- tampered session cookie → /dashboard/members redirects to /login server-side;
- report anything with low contrast or hardcoded colours.
Done when: lint + build pass, the text-level frame comparison (per P0) is reported, the browser checklist is
delivered, and my pasted results are recorded (failures fixed or logged).
Report a checklist with one line per numbered step: done / deviated (why) / skipped (why).
Append disagreements; suggest a commit message.
```

### P5b: Members page, role changes (core)

```text
Phase P5b (Members page, role changes, core scope). P5a built the page, states, filters, store, URL state and the
table with a TEMPORARY read-only Badge in the Role column. In this phase replace that temporary read-only badge
from P5a with RoleControl, and add the AlertDialog, the mutation hook and the toasts. Visuals and copy come from
`design reference/Members Page.dc.html` (lines 247-297 and 499-517; DCLogic applyRole) and
`design reference/Members Handoff Spec.dc.html` §4–§6. Compare (from text, per P0) with the frames in
`design reference/Members Frames.dc.html`: D10–D16, T3, M4. Design wins on visuals, sizes, tokens, copy and layout;
this prompt wins on behaviour, security and scope; log conflicts in SUBMISSION. The critical values and copy are
repeated below, so the prompt stands on its own.
All new members files live in app/portal/src/app/dashboard/members/ unless stated otherwise; client-safe shared
types stay in src/lib.

1. `role-change.ts` (pure, no directive; imports only from @/lib/members-types and http-error):
   `class RoleChangeError extends Error { code; status }`, `toRoleChangeError(result)`, `roleChangeMessage(code)`,
   `roleToastId(tenantId, userId)` (→ `role-${tenantId}-${userId}`), `isRoleChange(current, next)`,
   `canStartRoleChange(pendingUserIds, userId)`, and
   `applyRoleChange(data, userId, role)` (immutable; returns the same reference if userId not found; changes only
   `role` of that member and copies isSelf/canChangeRole/viewer unchanged — never recomputes flags; the server
   MemberDto from onSuccess is the truth). Messages:
   SELF_DEMOTION_FORBIDDEN "You can't remove your own admin access." · LAST_ADMIN_REQUIRED "An organization needs at least one admin." ·
   NOT_TENANT_ADMIN "You no longer have permission to change roles." · MEMBER_NOT_FOUND "This person is no longer a member." ·
   TENANT_NOT_FOUND "You no longer have access to this organization." · ROLE_CHANGE_CONFLICT "Someone else changed roles at the same time. Please try again." ·
   API_UNAVAILABLE "Can't reach the server. Please try again." · default "Couldn't update the role. Please try again."
2. `RoleControl({ member, tenantId, variant: 'select' | 'menu' })` — implement 'select' now, design the API so P6
   only adds 'menu'. It replaces the temporary read-only Badge that P5a put in the Role column. Renders only if
   member.canChangeRole, else the read-only Badge (keep P5a's Badge visuals). Self row/card: the reason
   "You can't change your own role" is attached with aria-describedby (sr-only text) AND shown in a tooltip that opens
   on focus/tap, not hover only. aria-label "Change role for {name}". Picking the CURRENT role only closes the menu
   (no mutate, no optimistic patch, no toast): gate on `isRoleChange(current, next)` from role-change.ts. Admin→Member opens AlertDialog: title "Remove admin access for {name}?",
   body shows {email} under the name, then "Loses: changing members' roles" and "Keeps: access to {tenant} and the
   member list"; buttons "Keep as Admin" (cancel) and "Remove admin access" (destructive). Member→Admin applies
   immediately. While that member's mutation is pending (useMutationState filtered by userId), the optimistic value
   is shown and one pending mutation per member is enforced IN CODE for BOTH variants (Select now, the chart ⋯ menu
   in P6):
   - the trigger keeps its size, its text turns muted, cursor-not-allowed;
   - `aria-busy` + `aria-disabled` (NOT the disabled prop, so focus stays on the trigger), and onValueChange/open
     are ignored in code via `canStartRoleChange(pendingUserIds, userId)`, with pendingUserIds taken from
     useMutationState (mutationKey ['updateMemberRole', tenantId], status pending);
   - LoaderCircle 16 animate-spin replaces the chevron;
   - one page-level sr-only `aria-live="polite"` region says "Saving role…" and is cleared when done;
   - the AlertDialog confirm re-checks `canStartRoleChange` with the current useMutationState userIds right before
     calling mutate, so a dialog opened just before a mutation started can't fire a second one.
   Visuals (design, `Members Page.dc.html` lines 247-297 and 499-517):
   - SelectTrigger: w-[136px] h-9 max-sm:h-10 pl-3 pr-2.5 border-input rounded-md shadow-elev-sm hover:bg-muted,
     label 14px regular (not font-medium), ChevronDown 16 muted.
   - SelectContent: w-[264px] p-1 bg-popover border-popover-border shadow-elev-lg rounded-md, items gap-0.5.
   - Items: py-1.5 px-2 rounded-sm (4px) flex items-start gap-2, focus outline 2px ring -outline-offset-2; a title
     (font-medium) over a 12/16 muted description, "Admin" / "Can change other members' roles" and "Member" /
     "Can view members, read-only". Keep the description OUTSIDE SelectItemText so the trigger shows only the role.
     Check 16 (mt-0.5) on the current role; focus the current option on open.
   - Opening the Select selects the row (selectedId); a role change selects the changed person.
   - Read-only Badge: as built in P5a (rounded-full px-2.5 py-0.5 text-xs font-medium border-0; Admin
     bg-badge-admin-bg text-badge-admin-fg; Member bg-badge-member-bg text-badge-member-fg).
   - Self row: the badge, with a Lock 12 icon before the label and pl-2, sits inside a
     `<button type="button" aria-describedby=…>` (max-sm:min-h-10). It uses a CONTROLLED Tooltip that opens on
     pointer enter, focus AND click/tap, and closes on blur, leave, Escape, scroll and window resize (Radix Tooltip
     doesn't open on touch). Tooltip: side="top" sideOffset={6}, centred, bg-foreground text-background px-2.5
     py-1.5 rounded-md text-xs font-medium whitespace-nowrap, 150ms opacity transition.
   AlertDialog:
   - Content: max-w-[448px] w-[calc(100vw-32px)] p-6 rounded-xl bg-popover border-popover-border shadow-elev-lg gap-2.
     Overlay: bg-overlay.
   - Title 16/24 600, then {email} muted.
   - Description: a <dl> grid (auto 1fr, gap 6px 8px, mt-2) with dt "Loses:" / dd "changing members' roles" and
     dt "Keeps:" / dd "access to {tenant name} and the member list".
   - Footer: flex flex-wrap justify-end gap-2 mt-4. Cancel "Keep as Admin" is outline with bg-popover (not
     bg-background, so it blends into the panel) and gets initial focus; the action "Remove admin access" is
     destructive with no border. Tab stays trapped between exactly these two buttons.
   - Escape AND a click on the overlay cancel (add an overlay click handler; Radix AlertDialog ignores outside
     clicks by default). A cancel never writes.
   - The dialog opens from Zustand pendingDemotion with no Trigger, so remember the opener and restore focus to it
     in onCloseAutoFocus.
   - One focus rule after a change: in the List, focus returns to the Select trigger. In the Chart (P6), after the
     optimistic move the card remounts in the other group, so focus
     `.react-flow__node[data-id="${CSS.escape(userId)}"] button[aria-haspopup="menu"]`, falling back to the node
     wrapper. In onCloseAutoFocus call `preventDefault()` when the remembered opener is `!isConnected`, and let that
     chart rule run (focus must never fall to <body>).
3. `use-update-member-role.ts` ('use client'): mutationKey ['updateMemberRole', tenantId];
    mutationFn → server action → `throw toRoleChangeError(res)` when !ok;
    onMutate(vars, context): `await context.client.cancelQueries({ queryKey: memberKeys.all(tenantId) })`, read
    previousRole of vars.userId via `context.client.getQueryData(memberKeys.all(tenantId))`, setQueryData with
    applyRoleChange, return { userId, previousRole };
    onError(err, vars, onMutateResult, context): UNAUTHENTICATED → handleUnauthenticated() and return (no failure toast);
    otherwise roll back ONLY that member (applyRoleChange(d, userId, previousRole)) + the error toast described below;
    for NOT_TENANT_ADMIN / MEMBER_NOT_FOUND / TENANT_NOT_FOUND / ROLE_CHANGE_CONFLICT invalidate immediately;
    onSuccess(member): write the server's returned MemberDto into the cache (setQueryData with a small pure
    `applyMember(data, member)` in role-change.ts) so the row shows the server's truth even while other mutations
    keep the invalidate skipped; also set selectedId to that person.
    Toasts: every toast (success and error) uses id `roleToastId(tenantId, userId)` = `role-${tenantId}-${userId}` (a newer result for the same person
    replaces the old toast instead of stacking; the design's person-only id is not used). Wording:
    - promote success: `toast.success("{name} is now an Admin", { id, description: "{email} · {tenant name}" })`;
    - demote success: neutral `toast("{name} is now a Member", { id, description, icon: <Info className="size-4" aria-hidden /> })`,
      not celebratory green (the design shows an Info icon);
    - errors: `toast.error(roleChangeMessage(code), { id, description })`. The description is "{name} is still a
      Member." | "{name} is still an Admin." (the rolled-back previousRole with its article) ONLY for codes that do
      not invalidate immediately: SELF_DEMOTION_FORBIDDEN, LAST_ADMIN_REQUIRED, API_UNAVAILABLE and the generic
      fallback (default). There is NO description for NOT_TENANT_ADMIN / MEMBER_NOT_FOUND / TENANT_NOT_FOUND /
      ROLE_CHANGE_CONFLICT (they invalidate and the server data speaks), and still no toast at all for
      UNAUTHENTICATED. Put this mapping in a pure helper in role-change.ts (e.g. `roleChangeErrorDescription(code,
      name, previousRole)`) and unit-test it in P7.
    - close button accessible name: the design uses "Dismiss notification: {title}" (see P4b step 2).
    onSettled(data, error, vars, onMutateResult, context): skip when error.code === 'UNAUTHENTICATED'; otherwise if
    `context.client.isMutating({ mutationKey: ['updateMemberRole', tenantId] }) === 1`
    → invalidateQueries({ queryKey: memberKeys.all(tenantId) }).
Browser checklist for me (numbered; step, expected result, frame id). My servers are running. Each visual item in
light AND dark (DevTools → Rendering → Emulate CSS prefers-color-scheme), compared visually with its frame:
- alice/acme opens bob's role Select: 264px content with two-line options, check on the current role (D10);
- promote bob → optimistic badge, spinner, aria-busy trigger, then success toast "{name} is now an Admin" (D11, D12);
- demote bob → AlertDialog over the backdrop, "Keep as Admin" focused, Tab trapped, Esc and backdrop click cancel
  without a request; confirm → neutral toast with Info icon (D13, D14; T3 at 768px; M4 at 390px). The "Remove admin
  access" label's computed colour (DevTools → Computed) is rgb(255, 255, 255) in both themes;
- alice cannot change herself: lock badge with tooltip on hover, focus and tap;
- bob/acme sees read-only roles;
- picking bob's current role sends no request (Network tab) and shows no toast;
- toasts, same person: as alice/acme promote bob, then quickly demote him (confirm) → the second toast replaces the
  first (same id role-{tenantId}-{userId}); two tenants: change bob in Acme, switch to Globex with the switcher and
  change carol within 6 s → two separate toasts (ids differ by tenant/user); then restore both: bob back to Member in
  Acme and carol back to Member in Globex (demote via the dialog), so later checks start from the seed roles. The
  seed has one changeable member per tenant, so two people in ONE tenant are covered by the P7 unit tests only
  (compare D16 from text);
- error toast with rollback (D15): e.g. stop the API, change a role → "Can't reach the server. Please try again." +
  "{name} is still a Member.", row rolled back; restart the API, reload, and if any role is no longer the seed role
  restore it (bob and carol back to Member via the dialog);
- role-only no-results: as alice/acme promote bob to Admin, open `?role=MEMBER` → "No members match" / "No one has
  the Member role." + "Clear filters", then demote bob back to Member;
- with the page open, tamper the session cookie then change a role → straight to /login (one sign-out, no failure
  toast);
- keyboard-only flow: role Select, demote dialog, toast close button;
- report anything with low contrast or hardcoded colours (Select, dialog + backdrop, toasts success/neutral/error,
  badges, selected row, focus rings).
Done when: lint + build pass, the text-level frame comparison (per P0) is reported, the browser checklist is
delivered, and my pasted results are recorded (failures fixed or logged).
Report a checklist with one line per numbered step: done / deviated (why) / skipped (why).
Append disagreements; suggest a commit message.
```

### P6: Chart view (core)

```text
Phase P6 (Org chart, core scope). Files in `src/app/dashboard/members/org-chart/`. Visuals, sizes and copy come
from `design reference/Members Page.dc.html` (chart markup lines 415-532; DCLogic layout(), fitView, centerOn) and
`design reference/Members Handoff Spec.dc.html` §5 (nodes, card states) and §7 (Canvas/Edges snippets). Compare
(from text, per P0) with frames D17–D21, T2 and M3 in `design reference/Members Frames.dc.html`. Design wins on visuals and copy; this
prompt wins on behaviour (React Flow instead of the mock's hand-rolled pan/zoom, auto-expand of the selected card's
group, focus handling), security and scope; log conflicts in SUBMISSION. The critical values are repeated below.
Not in this phase (P7b, do not build): the legend [?] button and its "Reading the chart" popover that appear in the
toolbar of every chart frame (D17–D21, T2); the small-screen "Best viewed on a larger screen." + "Switch to List"
hint in M3; chart search prev/next (Enter/Shift+Enter); prefetching the chart chunk on toggle hover/focus; the
Invited dashed border and Suspended muted name. The chart toolbar in this phase is Reset view plus the counter only.
Ignore these items when comparing with the frames (they are not mismatches) and do not run `shadcn add popover`.

1. `org-chart.tsx` with `export default function OrgChart`. `org-chart-lazy.tsx` ('use client'):
   `dynamic(() => import('./org-chart'), { ssr: false, loading: () => <skeleton aria-busy /> })`.
   MembersView renders it only when view === 'chart' (replace the P5a placeholder).
2. `org-chart.css` (imported by org-chart.tsx, so it only loads with the lazy chunk):
   `@import "@xyflow/react/dist/style.css" layer(base);` plus `.react-flow { --xy-background-color: var(--background);
   --xy-edge-stroke: var(--muted-foreground); --xy-controls-button-background-color: var(--card); ... }` inside
   `@layer base`. Never import `@xyflow/react/dist/style.css` directly from TSX (it would be unlayered and override
   Tailwind utilities). Map ALL visible React Flow colours to tokens so both themes come from one place:
   --xy-background-color (--background), --xy-background-pattern-color (--border), --xy-edge-stroke
   (--muted-foreground), --xy-node-border-radius (var(--radius-lg) = 8px, the pinned chart-card radius), --xy-controls-button-background-color (--card),
   --xy-controls-button-background-color-hover (--muted), --xy-controls-button-color (--foreground),
   --xy-controls-button-border-color (--border), --xy-edge-stroke-width (1.5), --xy-attribution-background-color (--card).
   Because the tokens already switch inside the prefers-color-scheme media query, light/dark needs no extra JS.
   Controls (design): vertical, bottom-left 16px, 40×40 buttons with 20px icons, bg-card, border, rounded-md,
   overflow-hidden, shadow-elev-sm, 1px border-b border-border dividers between the three buttons, inset focus ring
   (outline 2px ring, offset -4px).
   Attribution: keep it visible (never hide it), bottom-right, px-2 py-0.5, bg-card, border-t border-l,
   rounded-tl-md, text-xs muted, hover foreground; the link text "React Flow" is font-medium.
3. `build-org-graph.ts` (pure): ({ tenant, members, collapsed, filters: { q, role }, selectedId }) → { nodes, edges }.
   Layout from the design.
   - Constants: CARD_W 240, CARD_H 72, GAP 16, PAD 24, HEAD 44, ORG_W 280, ORG_H 80, GROUP_Y 144 (64 below the
     tenant node), COL_GAP 64.
   - Per group:
     - cols = clamp(ceil(sqrt(max(n, 1))), 1, 8), rows = ceil(n / cols);
     - width = 2*PAD + cols*CARD_W + (cols-1)*GAP;
     - height = HEAD when collapsed, HEAD + 2*PAD + rows*CARD_H + (rows-1)*GAP with cards, HEAD + 68 (= 112) when empty.
   - Placement:
     - Admins group at x 0 and Members group at x = adminsWidth + COL_GAP, both at y GROUP_Y;
     - tenant node centred over the total width: x = (totalW - ORG_W) / 2, y 0, with totalW = max(Members right edge, ORG_W);
     - member nodes use parentId + extent 'parent', sorted by name, then userId; card i sits at
       x = PAD + col*(CARD_W+GAP), y = HEAD + PAD + row*(CARD_H+GAP).
   - nodes[] order MUST be: tenant, Admins group, admin cards, Members group, member cards (React Flow's Tab order
     follows array order; this also keeps parents before children). Inside a node the Tab stops are the node wrapper
     then its own button (group header / card menu trigger).
   - Edges: exactly 2, tenant→Admins and tenant→Members. type 'smoothstep', pathOptions { borderRadius: 12 },
     focusable false. Source handle at the tenant's bottom centre, target handle at the group's top centre.
   ariaLabel per node (design copy):
   - tenant: "{tenant name}, {n} person|people"
   - group: "{Admins|Members}, {n} person|people", plus ", collapsed" when collapsed
   - card: "{name}[ (you)], {email}, {Admin|Member}, {Active|Invited|Suspended}", plus ", not matching" when dimmed
   data carries member, match (= `matchesMember(member, filters)` from member-filters.ts, so the Role filter also
   dims cards and the counter equals the List's), dim (= filters active && !match), selected and canChangeRole.
   - A group with no matches stays visible but dimmed: bg-transparent, dashed border, muted title.
   - Collapsed groups have no children.
   - A group with zero members shows "No one has this role." (this covers frank/wayne's empty Members group). The
     defensive `empty` state renders the tenant node only.
4. Nodes (memo; nodeTypes at module scope; tokens only; no shadows on cards).
   - TenantNode:
     - 280×80, rounded-lg border bg-card px-4 gap-3;
     - a 40px rounded-lg bg-primary text-primary-foreground tile with the tenant's first letter (16/600, aria-hidden);
     - name 16/24 600 truncate, plus "{n} person|people" muted tabular-nums.
   - RoleGroupNode:
     - rounded-xl border bg-muted overflow-hidden;
     - header h-11 pl-2 pr-3 gap-1.5, border-b when expanded;
     - collapse <button aria-expanded aria-label="Collapse Admins"|"Expand Admins"> (likewise Members): size-7
       max-sm:size-10 rounded-md hover:bg-background, `nodrag nopan`, ChevronDown 16 rotated -90° when collapsed (150ms);
     - title "{Admins|Members} ({n})" font-semibold tabular-nums;
     - empty body: <p className="p-6 text-muted-foreground">No one has this role.</p>.
   - MemberNode:
     - 240×72, rounded-lg border bg-card px-3 py-2.5 gap-2.5 items-start cursor-pointer, hover:border-input, focus
       outline 2px ring offset 2;
     - Avatar 32 with initials;
     - text column:
       - line 1 (flex items-baseline gap-1 leading-5): name font-medium truncate + "(you)" muted shrink-0;
       - line 2: email text-xs font-medium text-muted-foreground truncate (text-foreground when dim);
       - line 3 (mt-px flex items-center gap-2, text-xs font-medium): role badge px-1.5 rounded-full + status
         `inline-flex items-center gap-1` with a 6px dot + label in foreground.
   - RoleControl variant 'menu', only when member.canChangeRole:
     - trigger: ghost icon button size-7 max-sm:size-10 -mt-1 -mr-1.5 rounded-md text-muted-foreground
       hover:bg-muted hover:text-foreground, Ellipsis 16 (LoaderCircle while pending);
     - `nodrag nopan`, aria-label "Change role for {name}" (same as the List), aria-haspopup="menu", stop keydown
       propagation; opening also selects the card;
     - DropdownMenuContent w-[200px] align="end" p-1 bg-popover border-popover-border shadow-elev-lg, with
       DropdownMenuLabel "Role" (12/16 font-medium muted, px-2 py-1.5) and DropdownMenuRadioGroup value=role →
       RadioItems "Admin" / "Member": h-8 max-sm:h-10 px-2 rounded-sm (4px), focus/hover bg-muted with NO outline,
       checked indicator an 8px currentColor dot in a 16px slot; focus the checked item on open;
     - while that member's mutation is pending, open and select are ignored in code (aria-disabled + aria-busy, not
       the disabled prop), exactly like the Select variant: gate on `isRoleChange` and `canStartRoleChange` from
       role-change.ts; the shared AlertDialog confirm re-checks `canStartRoleChange` with the useMutationState
       userIds before mutate.
   - Card states (data attributes, tokens only):
     - selected: bg-selected border-selected-border `ring-2 ring-ring`, avatar bg-background. It wins over match.
     - match (filters active and hit): `ring-2 ring-match-ring`.
     - dim: bg-transparent; border and avatar border `color-mix(in_srgb,var(--border)_40%,transparent)`; avatar bg
       transparent; badge bg transparent with a `color-mix(… 60% …)` border; status dot opacity-40; email switches
       to text-foreground. NEVER fade text with opacity.
     - pending: bg-selected border-selected-border.
     - (The Invited dashed border and Suspended muted name are P7b; see "Not in this phase" above.)
   Handles present but invisible and not connectable.
   Selection: onNodeClick and Enter on a member node wrapper set selectedId (Zustand). This is not React Flow
   selection (elementsSelectable stays false).
5. <ReactFlowProvider><ReactFlow> inside `<section id="panel-chart" aria-label="Members chart" className="flex flex-col gap-3">`.
   Canvas: `relative h-[min(70dvh,720px)] min-h-[380px] rounded-xl border bg-background shadow-elev-sm overflow-hidden`
   (dvh on purpose; the design uses 70vh — log "70dvh vs design 70vh (mobile URL bar)" as a design/prompt conflict),
   role="group", aria-label "Org chart of {tenant name}: {nA} admin|admins, {nM} member|members. Drag to pan.",
   aria-describedby the help text id.
   Props:
   - colorMode="system"
   - fitView with module-constant fitViewOptions { padding: 0.06, maxZoom: 1 } (≈24px; use the px string form only
     if the installed typings accept it); duration is computed separately (reducedMotion ? 0 : 400)
   - minZoom 0.2, maxZoom 1.6
   - <Background variant={BackgroundVariant.Dots} gap={16} size={1} /> (import BackgroundVariant from
     @xyflow/react; a bare "dots" string fails type-checking in next build)
   - <Controls position="bottom-left" showInteractive={false} /> (aria-labels and titles "Zoom in", "Zoom out", "Fit view")
   - nodesDraggable / nodesConnectable / elementsSelectable / edgesFocusable false, deleteKeyCode / selectionKeyCode /
     multiSelectionKeyCode null, disableKeyboardA11y, ariaLabelConfig.
   nodes/edges = useMemo(buildOrgGraph(...)) from the SAME query + Zustand + useDeferredValue(q). NO useNodesState /
   onNodesChange / useEffect syncing.
6. Visually-hidden help text (its id is referenced by the canvas aria-describedby): "Use Tab to move between people.
   For a sortable table, switch to List view." No second or nested section and no aria-labelledby.
   Search and the role filter use the shared `q` and `role`: matches get the match ring, non-matching cards get the
   dim treatment from step 4 (never opacity on text), and the counter shows "x of N".
   "Reset view" is an outline button in the toolbar (h-9 px-3.5 gap-2, RotateCcw 16): it expands both groups, clears
   selectedId, then calls fitView.
   Entering the Chart (toggle or ?view=chart on load):
   - with a selectedId: expand its group if collapsed, centre that card at 100% with
     `fitView({ nodes: [{ id }], minZoom: 1, maxZoom: 1, duration: reducedMotion ? 0 : 400 })`, then focus
     `.react-flow__node[data-id="${CSS.escape(id)}"]`;
   - otherwise: fitView.
   Re-fit (same duration rule) after a group collapses or expands, or after a card changes group, keeping focus where
   step 7 puts it.
7. Role changes from a card use the same hook + AlertDialog; the card moves group optimistically and back on rollback.
   Robustness: DropdownMenu/AlertDialog/Tooltip content stays portalled to body (Radix default — never inline inside the
   transformed viewport; the zoom check goes in my browser checklist); an open card menu closes on React Flow
   `onMoveStart`. Focus after a promote/demote (same single rule as P5b): the card remounts in the other group, so
   focus `.react-flow__node[data-id="${CSS.escape(userId)}"] button[aria-haspopup="menu"]`, falling back to the node
   wrapper; in onCloseAutoFocus call `preventDefault()` when the remembered opener is `!isConnected`. Focus must
   never fall to <body>.
8. Lazy-chunk check (your own CLI work): after `pnpm --filter portal build`, run
   `grep -rlE "react-flow__pane" app/portal/.next/static/chunks`, then confirm none of those chunk file names appears
   in the page's EAGER entry files only: the entryJSFiles / entry chunks of /dashboard/members in
   `app/portal/.next/server/app/dashboard/members/page_client-reference-manifest.js`, plus the build-manifest
   entries for that page if present (`grep -nE "<chunk-name>" <those files>`). Don't grep every file under
   `.next/server/app/dashboard/members*`: a hit in react-loadable-manifest.json is expected (it records the lazy
   chunk, not an eager load); report it, but do not treat it as a failure. Report the result next to my Network-tab
   result.
Browser checklist for me (numbered; step, expected result, frame id). Each visual item in light AND dark, compared
visually with its frame (ignore the P7b-only items listed above):
- ?view=chart as alice/acme: tenant node, two groups, two edges, controls bottom-left, attribution visible (D17;
  T2 at 768px; M3 at 390px without the P7b hint);
- search "bob" → Admins group dimmed (dashed, muted title), bob's card has the match ring, dimmed text still
  readable (D18);
- collapse/expand the Members group, re-fit follows (D19);
- select bob in the List, switch to Chart → his group expands, the card is centred at 100% and focused (D20);
- open bob's ⋯ menu (D21), promote and demote through it (dialog over the canvas), the card moves group and focus
  lands on its ⋯ button; the List shows the same role afterwards;
- menus/dialog stay correctly placed at ~50% and ~150% zoom; panning closes an open card menu;
- List↔Chart switch sends no new members request (Network tab);
- ?view=list loads no chunk containing "react-flow__pane" (Network tab);
- keyboard Tab order: tenant → Admins → admin cards → Members → member cards; Enter on a card selects it;
- frank/wayne: Members group shows "No one has this role.";
- the dark RoleGroupNode edge (--border equals --muted there) is still distinguishable; canvas background + dots,
  edges, group containers, cards, match ring, selected card and controls in both themes.
Done when: lint + build pass, the lazy-chunk CLI check passes, the text-level frame comparison (per P0) is reported,
the browser checklist is delivered, and my pasted results are recorded (failures fixed or logged).
Report a checklist with one line per numbered step: done / deviated (why) / skipped (why).
Append disagreements; suggest a commit message.
```

### P7: Test portal, perf, a11y & security pass

```text
Phase P7 (portal tests + verification). Design wins on visuals, sizes, tokens, copy and layout (design files named
below); this prompt wins on behaviour, security (DB-validated tenant, authz flags only from the API, no frontend
authz) and scope; log every conflict in SUBMISSION.

1. app/portal/vitest.config.ts: `resolve: { tsconfigPaths: true }`, `test: { environment: 'node', include: ['src/**/*.spec.ts'] }` (AGENTS.md: `*.spec.ts` next to the code),
   no globals (import describe/it/expect from 'vitest'; justify in SUBMISSION: the portal tsconfig includes `**/*.ts`,
   so `next build` type-checks tests); script `"test": "vitest run"`. Tests must not import files that
   (transitively) import 'server-only' or 'use client' hooks; do not alias/mock 'server-only'. Make sure
   `pnpm --filter portal build` still type-checks with the config and tests present.
   The targets below live in pure modules (P4b members-types.ts; P5a members-view-state.ts, member-filters.ts,
   members-copy.ts, format-joined.ts, summary.ts; P5b role-change.ts; P6 build-org-graph.ts). If a tested function
   still lives in a client file, move it to its pure module without behaviour change, note it in SUBMISSION, and
   put a re-check of the affected page in my browser checklist.
   If P6 was skipped: skip the build-org-graph tests and the chart checks below, remove @xyflow/react from the portal
   deps (lockfile updated), also remove the Chart toggle item and the P5a chart placeholder and make view=chart fall
   back to list (or keep the toggle item disabled with a note), and list the chart under "Incomplete requirements and
   limitations" in SUBMISSION.
2. Unit tests:
   - members-view-state: every branch + precedence (error wins over stale data; only-you beats no-results when a
     filter hides the own row; filteredCount 0 without active filters is not no-results; TENANT_NOT_FOUND → no-access).
   - toMembersResponse / toMemberDto: strip extra fields (passwordHash), keep all fields, throw on missing viewer /
     bad role or status enum.
   - role-change: roleChangeMessage for every code + fallback; toRoleChangeError keeps code/status;
     applyRoleChange immutable, unknown id → same reference; apply A then B, roll back A → B unchanged, A restored;
     applyRoleChange copies isSelf/canChangeRole/viewer unchanged (never recomputes flags);
     roleToastId: two different userIds in one tenant → different ids, the same userId in two tenants → different
     ids, the same tenant + userId → the same id (this is the only coverage of two people changed in ONE tenant,
     because the seed has one changeable member per tenant).
   - build-org-graph:
     - parents before children; exactly 2 edges; collapsed group has no children (height 44);
     - deterministic design positions: groups at y 144, COL_GAP 64, tenant centred, card offsets
       x = 24 + col*256 / y = 68 + row*88, empty group height 112;
     - cols = clamp(ceil(sqrt(max(n, 1))), 1, 8) (n = 1 → 1, 2 → 2, 5 → 3, 100 → 8);
     - match is case-insensitive and treats regex metacharacters literally;
     - canChangeRole=false never yields an action;
     - zero non-self members → Members group shows "No one has this role." and has no member children;
     - the role filter sets dim (never an opacity class on the card or its text; only the status dot uses
       opacity-40) on non-matching cards, and the match count equals the
       List's filtered count;
     - ariaLabels use the design copy.
   - member-filters: matchesMember (q, role, both, regex metacharacters literal); compareMembers stable tie-break
     (name → userId) for every sort key.
   - no-results copy (members-copy.ts): NO_RESULTS_TITLE is "No members match"; noResultsBody: q only → "Nothing
     matches “zed”."; q + role → "Nothing matches “bob” with role Admin."; role only → "No one has the Admin role.";
     CLEAR_FILTERS_PATCH (member-filters.ts) has exactly the keys q and role (so clearFilters keeps sort/view/tenant).
   - other state copy (members-copy.ts): NO_ACCESS_COPY, onlyYouCopy(tenantName) and loadErrorBody (API_UNAVAILABLE
     vs other codes) match the design strings exactly.
   - summary: plurals (1 person / 2 people, 1 admin / 2 admins), zero counts omitted, " · " separator, "You are an
     Admin" vs "You are a Member", read-only suffix only when canManageRoles=false.
   - formatJoined (format-joined.ts) returns "Oct 20, 2026" for 2026-10-20T… in any process time zone.
   - error-toast description mapping: "{name} is still a Member." / "{name} is still an Admin." (the rolled-back
     role) for SELF_DEMOTION_FORBIDDEN, LAST_ADMIN_REQUIRED, API_UNAVAILABLE and an unknown code (fallback); NO
     description for NOT_TENANT_ADMIN, MEMBER_NOT_FOUND, TENANT_NOT_FOUND and ROLE_CHANGE_CONFLICT; UNAUTHENTICATED
     yields no toast.
   - role-change: applyMember replaces exactly one member; isRoleChange(current, next) is false for the same role
     (so a same-role selection never mutates) and true otherwise.
   - pending guard: canStartRoleChange(pendingUserIds, userId) is false when that userId is pending (blocks a second
     change from the Select, the ⋯ menu or the AlertDialog confirm) and true for a different member.
3. Real-DB persistence check: re-run the root README "Verify the members API" curl steps against my running API
   (API=http://localhost:<API_PORT from .env>, see P0), incl.
   PATCH → GET → (I restart the API) → GET still shows the new role; then restore bob to MEMBER.
4. Performance (your own CLI work): `pnpm --filter portal build`, then the lazy-chunk check:
   `grep -rlE "react-flow__pane" app/portal/.next/static/chunks`, and confirm none of those chunk file names appears
   in the page's EAGER entry files only: the entryJSFiles / entry chunks of /dashboard/members in
   `app/portal/.next/server/app/dashboard/members/page_client-reference-manifest.js`, plus the build-manifest
   entries for that page if present (`grep -nE "<chunk-name>" <those files>`). A hit in react-loadable-manifest.json
   is expected (it records the lazy chunk, not an eager load); report it, but do not treat it as a failure. Use
   `next experimental-analyze` too if available. Browser items for my checklist: Network tab shows ?view=list loads no React Flow chunk; no
   hydration warnings in the console; with the network throttled, the h1 and the toggle's top edge do not move when
   content replaces the skeleton fallback (no layout shift skeleton → table).
5. A11y and themes. Browser items for my checklist (Lighthouse/axe = DevTools built-in, nothing to install):
   keyboard-only (search, filter, toggle, role select, confirm dialog, chart Tab order), visible focus, aria-sort,
   labels, toast announcements, reduced motion; a theme pass in light AND dark via DevTools "Emulate CSS
   prefers-color-scheme"; Lighthouse/axe contrast results on /dashboard/members (list and chart) per theme; the
   destructive pair checked against the computed style of the rendered "Remove admin access" button (not just the
   token values: label rgb(255, 255, 255)); reload in dark → no light flash; a visual comparison of each state with
   its frame in `Members Frames.dc.html` (you list the frame ids; your own comparison is from text, per P0).
   Your own CLI work: verify the design's contrast table (`design reference/Members Handoff Spec.dc.html` §3, const PAIRS, 38 pairs)
   against the values actually shipped in globals.css. Composite translucent tokens over the surface they sit on.
   - Text pairs ≥ 4.5:1:
     - foreground on card (body text AND status label — two PAIRS rows), page and selected-over-card;
     - dialog text (foreground on popover);
     - muted-foreground on card, page, muted (hover row), selected-over-card and popover;
     - placeholder (muted-foreground on background);
     - badge-admin-fg / badge-admin-bg and badge-member-fg / badge-member-bg over card;
     - primary-foreground on primary and primary-hover;
     - destructive-foreground on destructive and destructive-hover;
     - outline label (foreground on background); link on background;
     - toast success/error/neutral text; alert-error-fg / alert-error-bg over card;
     - tooltip (background on foreground);
     - chart group title and dimmed card text (foreground on muted); suspended name (muted-foreground on card).
   - UI pairs ≥ 3:1: ring vs card/page/selected/muted; match-ring vs muted; input vs background/muted/popover; each
     status dot vs card (light: Active #059669, Invited #d97706, Suspended #f43f5e).
   Report a table (pair, light ratio, dark ratio, pass) computed from the real CSS values. The report must list all
   38 PAIRS rows by their design label, not a regrouped subset (the Lighthouse/axe results come from my checklist).
   `grep -rnE "#[0-9a-fA-F]{3,8}\b" app/portal/src --include=*.tsx --include=*.ts` must return nothing, and hex may
   appear only in globals.css token definitions. No hardcoded colours in components; the design's literal `#ffffff`
   on the destructive button becomes --destructive-foreground (the built CSS must contain a
   `.text-destructive-foreground` rule).
6. Security greps (report results; ripgrep is not installed, use `grep -rnE` or the Grep tool, never rg):
   `grep -rnE "use cache" app/portal/src` (none on member data) · `grep -rnE "dangerouslySetInnerHTML" app/portal/src` (none) ·
   `grep -rnE "x-tenant-id" app/api/src app/portal/src --exclude=*.spec.ts` (none; spoofed-header tests must stay) ·
   no 'use client' file has a VALUE import from @/lib/api, @/lib/session or @/lib/members (`import type` is fine) ·
   `grep -rnE "export (async )?(function|const) (POST|PUT|PATCH|DELETE)" app/portal/src` (none) ·
   `find app/portal/src -name route.ts` (only bff/tenants/[tenantId]/members/route.ts, and it exports only GET) ·
   `grep -rnE "data-theme|toastPreview|dataState|saveResult|mobileList|orgAccess|Illustrative|ILLUSTRATIVE|Benoz|qp\.(sel|demo|collapse)" app/portal/src`
   (none: no design preview knobs or placeholder names in the product) ·
   `git ls-files | grep -E "(^|/)\.env($|\.)" | grep -v "\.env\.example$"` (empty) ·
   `git ls-files | grep -E "design reference|orgchart-plan|support\.js"` (empty).
Done when:
- `pnpm --filter api test`, `pnpm --filter api test:e2e`, `pnpm --filter portal test`, both lints and both builds
  pass — paste the summaries;
- the contrast table, hex grep, lazy-chunk check and security greps are reported;
- the browser checklist (steps 1, 4 and 5) is delivered and my pasted results are recorded (failures fixed or logged).
Report a checklist with one line per numbered step: done / deviated (why) / skipped (why).
Append disagreements; suggest a commit message.
```

### P8: Hosting (required by TASKS.md)

The account steps are done **by the owner**. Claude Code prepares, verifies, and writes the results back. Run this after P7 so that the deployed build is the same as the submitted one. The API may be deployed earlier (after P3) to catch Railway problems, then redeployed.

```text
Phase P8 (hosting per TASKS.md "To do: hosting"). I do the Railway/Vercel/GitHub account steps; you prepare,
verify and write back. Never use `nest deploy`.
1. Give me the exact checklist:
   Railway (Root Directory empty): build `pnpm install --frozen-lockfile && pnpm api:build`, pre-deploy `pnpm db:deploy`
   (applies add_user_status), start `pnpm api:start`, watch paths `app/api/**`; variables DATABASE_URL
   (${{Postgres.DATABASE_URL}}), JWT_SECRET (`openssl rand -base64 32`), JWT_EXPIRES_IN=1d, PORTAL_URL (Vercel URL);
   no API_PORT; generate a public domain; seed from my machine: Git Bash only: `DATABASE_URL="<public url>" pnpm db:seed`;
   PowerShell: `$env:DATABASE_URL='<public url>'; pnpm db:seed; Remove-Item Env:DATABASE_URL` (always remove it, or
   a later local `pnpm db:*` in that session would hit the hosted database).
   Vercel: Root Directory app/portal, NEXT_PUBLIC_API_URL=https://<api-domain> (no trailing slash), redeploy;
   then set PORTAL_URL on Railway.
2. When I give you the URLs, verify and paste outputs: curl POST /auth/login alice → accessToken; GET
   /tenants/<acme-id>/members with that token → 200 with status fields; carol on acme → 404 TENANT_NOT_FOUND.
   Then give me a browser checklist: sign in alice/123456, switch Acme/Globex, open Members list + chart, change
   bob's role and change it back, bob on acme sees read-only roles, sign out (per P0: STOP, then record my pasted
   results as "manual (by me)").
3. Write back: live URLs into TASKS.md "3. Submission" and README; tick the hosting checkboxes; re-run the .env
   tracking check; grep tracked files only for patterns —
   `git ls-files -z | xargs -0 grep -nE "rlwy\.net|railway\.internal|postgres(ql)?://[^@ ]+:[^@ ]+@[^l]"` — and for
   the LOCAL .env JWT_SECRET value. Never ask me to paste the production Railway JWT_SECRET; instead tell me to run
   `git grep -F "<railway secret>"` myself without pasting it.
Done when: URLs are live and verified, or the blocker is written down for SUBMISSION. Suggest a commit message.
```

### P9: Documentation & SUBMISSION

```text
Phase P9 (docs).
1. Re-check AGENTS.md matches the final implementation (DB-validated route param, DB authz, @IsEnum, transaction
   rules, no 'use cache' for authorized data, initial load in lib inside Suspense + BFF GET for client refetch +
   Server Action mutations, sign-out flow). `grep -rnE "x-tenant-id|isTenantAdmin" AGENTS.md` may only match text saying
   the header is ignored.
2. README (root):
   - Near the top, add one line: 'Assessment submission notes: see [SUBMISSION.md](SUBMISSION.md) (includes "Where I
     disagreed with the repo or my AI")'.
   - "### Data model": add User.status UserStatus ACTIVE | INVITED | SUSPENDED.
   - "## Project structure": add api members/ and tenancy/; portal app/bff/ and dashboard/members/ (incl. org-chart/).
   - "## How it works": add the Members page, BFF GET and Server Action flow.
   - Don't change the README's default ports: examples keep API 3000 / portal 3001 with the note "use your API_PORT
     from .env"; laptop-specific ports never appear in the README.
   Members page, light/dark (follows the OS; how to preview both with DevTools emulation), API endpoints +
   status/code matrix, `pnpm --filter portal test`, account status in the
   test-accounts table, "Verify the members API" steps, live URLs, and a "How to see each UI state" table
   (loading: throttle; no-access: carol ?tenant=acme; error: stop API + retry; only-you: frank/wayne;
   no-results: ?q=zed; INVITED: dave/umbrella; SUSPENDED: erin/stark; empty: unit-tested fallback, unreachable via
   API by design).
2b. TASKS.md: tick each "To do: tenant members page" checkbox only after it is verified by a passing test or check
   (incl. my pasted browser results); leave unmet ones unticked and list them under "Incomplete requirements and
   limitations" in SUBMISSION.
2c. `grep -rnE "Benoz" README.md SUBMISSION.md AGENTS.md` must return nothing (the mock's placeholder tenant name).
3. Finish SUBMISSION.md (English, short, factual) with these H2 sections in this order:
   ## What I implemented — incl. a sub-list "Intentional enhancements beyond the stated requirements" naming only what
      actually shipped (chart view, search/sort, sticky table header, truncated-email tooltip, toast cap of 3 / 6 s,
      any P7b items such as legend, stacked mobile cards, small-screen hint, Invited/Suspended card styling) and why
      each is cheap and tested.
   ## Design decisions and assumptions
   Lead with the security and authorization decisions (assessors grade these first), then keep the design part short.
   - Security and authorization: tenant from the route param + DB membership guard on every request (x-tenant-id
     ignored); 404 vs 403; authorization read from the DB (no JWT tenants claim), re-read inside the PATCH
     transaction with a row lock at READ COMMITTED vs Serializable; 409 for self-demotion; last-admin as an invariant
     guard and why it exists; BFF GET + Server Action (token never in the browser, upstream bodies reduced by
     toMembersResponse/toMemberDto and an error-code allowlist); no 'use cache' for authorized data; authorization
     flags only from the API. The pre-existing Overview "Admin" panel gates only static sample data by the /auth/me
     role, so it is display-only; the API enforces everything.
   - Tenant→Role chart (no reporting line exists); status = account-level
      UserStatus, display-only; all members can read the list (quote the PDF Background
      sentence and the one-line change to make it admin-only); members page resolves unknown
      slugs to no-access while Overview falls back; replaced e2e harness; dependency
      justification table + rejected libraries.
   - UI design (3-4 lines): made with Claude Design from my brief and kept as a local reference (not committed:
     tokens.css, Members Page, Handoff Spec, Frames); tokens ported into globals.css; design wins on visuals/copy,
     these rules win on behaviour/security/scope. Then put the full token and conflict lists below inside one
     collapsed `<details><summary>Design tokens and design/prompt conflicts (full list)</summary> … </details>` block
     in this same section (so every conflict stays logged in SUBMISSION):
   - Token changes vs the brief, with the designer's contrast reasons: muted-foreground #67676f; darker --input;
     --primary-hover #4338ca in both themes; zinc-800 dark popover + --popover-border; emerald-600 / amber-600 light
     Active/Invited dots (rose-500 Suspended kept); darker light toast text; new --link / --destructive-hover
     (red-700, because a red-500 hover drops white text to 3.76:1) / --selected-border / --alert-error-*.
   - Radius scale pinned to the design's pixels (4/6/8/12) through @theme radius tokens instead of shadcn's
     0.625rem-derived 6/8/10/14.
   - Design/prompt conflicts and how I resolved them:
     - copy adopted from the design: no-access without a link; one "No members match" + "Clear filters"; only-you;
       "No one has this role."; role option descriptions; "{name} is still a Member." / "{name} is still an Admin."
       error-toast descriptions, but only for
       codes that don't invalidate (SELF_DEMOTION_FORBIDDEN, LAST_ADMIN_REQUIRED, API_UNAVAILABLE, fallback) — the
       others let the refetched server data speak;
     - skeleton: 5 rows plus a title-block and toolbar placeholder (no layout shift);
     - chart: cols = ceil(√n); zoom 0.2–1.6, fit padding ≈24px, selected card centred at 100%; dimming the card
       chrome instead of opacity;
     - chart canvas height 70dvh vs design 70vh (mobile URL bar);
     - any time-pressure fallback actually taken (tooltip → title attribute, selected-card centring → plain fitView);
     - toast id role-{tenantId}-{userId} instead of the person id;
     - q/role/sort reset on tenant change, and the selected card's group auto-expanded (both missing from the mock);
     - only-you wins over no-results even when a filter is active (the mock shows only-you only without filters);
       the rows still follow the filter (own row may be hidden, counter "0 of 1") and the only-you block has no
       Clear filters button;
     - error-state summary left blank (the mock showed "Loading members…");
     - AlertDialog cancels on backdrop click;
     - View ToggleGroup: ArrowLeft/ArrowRight also switch the view (design behaviour), unlike Radix, which only
       moves focus;
     - tenant switcher maps the API enum ADMIN/MEMBER to "Admin"/"Member" for display only;
     - Sonner error toasts stay polite if per-toast role=alert isn't supported (and the close-button label, if
       Sonner can't set it).
   - Built with the design's Empty pattern because the design has no frame for them: empty, no organizations,
     background refresh, chart loading.
   - Preview-only knobs in the design (theme switch, scenario props, stress dataset) were not built; the product
     follows the OS theme.
   - The mock's placeholder tenant name is not used; the UI renders tenant names from the API (don't write the
     placeholder name itself anywhere; see step 2c).
   (End of the `<details>` block.)
   ## Tests I ran and their results — real summaries (api unit, api e2e, portal unit, lints, builds) + curl matrix +
      the browser checks, recording only the results I pasted, each labelled "manual (by me)". Note: concurrent role
      changes on different members in ONE tenant are verified by unit tests only (the seed has one changeable member
      per tenant; the manual toast check used two tenants).
   ## How I used AI — workflow, what I kept, what I changed.
   ## Where I disagreed with the repo or my AI — keep the running list (its own H2, exact title): x-tenant-id gateway
      claim; JWT isTenantAdmin; @IsString DTO; single update + nonexistent exception filter (P2025 → 500);
      'use cache' with the session token; @nestjs/observe; `nest deploy`; unmocked app.e2e-spec.ts; CORS `*` fallback;
      the deliberate convention deviation (initial load stays in lib inside Suspense, plus a BFF GET for client
      refetch); plus every AI suggestion I rejected.
   ## Incomplete requirements and limitations — "None" for functional requirements only if true; always list:
      status display-only (SUSPENDED can still log in); e2e persistence uses a Prisma mock (no real-Postgres test of
      the lock path); portal UI states verified manually + unit tests (no Playwright); hosting status; seed size fixed
      by TASKS; malformed JSON 400 has no `code`.
   ## Remaining risks — stale JWT identity until expiry (roles are fresh), no login rate limiting, full member list
      in the client (no pagination), dependency surface.
   ## What I'd improve before production — prioritized, each with why + value: (1) enforce account status at
      login/guard + token revocation or shorter TTL; (2) login rate limiting; (3) real-DB integration test for the
      concurrency path + Playwright e2e (UI states, rollback, chart keyboard flow); (4) persisted append-only role-change
      audit trail (actor, from, to, at — written in the same transaction) with a per-member history view, plus logging
      of REFUSED attempts (403/404/409, ids + code only, no PII) and observability without shipping PII to third
      parties; (5) server-side search/filter/sort/pagination + list virtualization + chart MiniMap /
      onlyRenderVisibleElements / large-group capping for large tenants; (6) server-provided lock reasons
      (e.g. roleLockReason: SELF | NOT_ADMIN) so the UI can explain every locked action as roles grow;
      (7) status-aware UX once status is enforced (status filter, resend invite); (8) undo + notifying the affected
      member; (9) CSP/security headers; (10) shared API contract types between api and portal.
4. Output a ready-to-paste submission message: fork URL (placeholder for me to fill), the Vercel portal URL, the
   Railway API URL, and a link to SUBMISSION.md#where-i-disagreed-with-the-repo-or-my-ai.
Done when: SUBMISSION.md has every section above (a separate "Where I disagreed…" H2 and "Remaining risks"), the
README links to it, the Benoz grep is empty, and the submission message is output.
Suggest a commit message.
```

**Send the submission (done by the owner, after P9; or after P7b if it is run):**
1. On GitHub, open *Settings → Collaborators* on the private fork and invite every reviewer named in the assessment email.
2. Make sure the fork's default branch contains the latest commit, and that `SUBMISSION.md` and the URLs in TASKS.md "3. Submission" are in place.
3. Send the fork URL, the Vercel portal URL, the Railway API URL, and a link to `SUBMISSION.md#where-i-disagreed-with-the-repo-or-my-ai` (use the ready-to-paste message from P9 step 4).

### P7b: Polish (optional, only after P7–P9 are green)

```text
Phase P7b (optional polish — only if everything above is green; each item independent, keep tests passing):
1. Chart search prev/next (Enter / Shift+Enter) → expand group if needed, fitView to the match, focus it.
2. Prefetch the chart chunk on hover/focus of the "Chart" toggle (`void import('./org-chart/org-chart')`).
(Visuals and copy for items 3–5 come from `design reference/Members Page.dc.html` (lines 115-141, 327-426), frames
M2/M3/D17 in `design reference/Members Frames.dc.html`; this prompt wins on behaviour and scope; log conflicts in
SUBMISSION. The critical values and copy are repeated below.)
3. Below 640px, a stacked card list (frame M2). Render both layouts and switch with Tailwind `hidden sm:block` / `sm:hidden`.
   - `<ul aria-label="Members of {tenant name}" className="flex flex-col gap-2">`.
   - Each <li>: bg-card border rounded-xl shadow-elev-sm p-4 flex-col gap-3; when selected, bg-selected border-selected-border.
   - Top row (gap-3): avatar 32, a name + "(you)" column with email (both truncate), and status dot + label on the right.
   - Bottom row: the role Select at full width (h-10) or the badge / self lock badge.
   - Joined is hidden.
   - Unlike the mock, cards are selectable (click/Enter → selectedId). Show the same only-you and no-results blocks
     (no-results: card p-8 px-4, no icon, "Clear filters").
4. Small-screen chart hint (frame M3), only below sm via CSS:
   - `role="note"`, flex gap-2, pl-3 p-1, bg-card border rounded-lg.
   - Monitor icon 16 muted, then "Best viewed on a larger screen. " and a link "Switch to List" (text-link
     font-medium underline underline-offset-2, min-h-10) that switches the view to list and focuses the List toggle.
   - A 40×40 dismiss button, aria-label "Dismiss hint", X icon; dismissal is in memory only.
5. Chart legend. Run `pnpm dlx shadcn@4.22.1 add popover -c app/portal -y` first (same STOP rule as P4a if it prompts).
   - A square outline button next to "Reset view" (outside the zoomed viewport): size-9 max-sm:size-10, CircleHelp 16,
     aria-label "Chart legend", aria-expanded.
   - It opens a Popover (role="dialog", aria-label "Chart legend"; closes on outside click — Radix default): w-[300px]
     p-4 bg-popover border-popover-border rounded-lg shadow-elev-lg, flex-col gap-3.
   - Title "Reading the chart" (16/24 600), then a grid with columns 96px 1fr and gap 10px 12px, verbatim rows:
     - Admin + Member mini badges → "Role in this organization"
     - 6px green dot + "Active" → "Account status, always with its label"
     - "(you)" → "Your own card. You can't change your own role."
     - a 24px swatch with a dashed --input border → "Invited, hasn't joined yet"
     - a 24px swatch with a color-mix(--border 40%) border → "Dimmed: doesn't match the search or role filter"
   - Esc closes it and refocuses the button.
   - Cards: Invited gets `border-dashed border-input`, and Suspended renders the name in muted-foreground. The text
     label is always there and contrast stays AA. While a card is dimmed, the Invited border STAYS dashed and only its
     colour switches to the 40% color-mix; the Suspended muting is dropped (dimmed text stays foreground).
Update SUBMISSION "Intentional enhancements" and the README with what shipped. Also replace the test/lint/build
summaries in SUBMISSION "Tests I ran and their results" with the new run, and update the hosting status after the
redeploy.
Done when: all tests, lints and builds pass again (paste summaries) and I have redeployed Railway/Vercel so the live
build matches the submitted code (re-run the P8 curl checks; the browser checks go in a checklist for me, per P0,
and only my pasted results are recorded). Suggest a commit message.
```

---

## 10. Test matrix

| Area | Unit (API) | E2E (API) | Portal |
|---|---|---|---|
| Authentication | – | 401: no token / malformed / wrong secret | UNAUTHENTICATED → clear cache + reload |
| Tenant isolation | guard: non-member 404, identity from `sub`, spoofed header ignored | carol→acme 404 · alice acme = {alice, bob} only · alice PATCH carol@initech (+globex header) 404 with no write · dave + acme header → umbrella only | slug outside the user's tenants → no-access without a request |
| Authorization | MEMBER on an ADMIN handler 403 · stale JWT claim ignored | bob PATCH acme 403 · bob GET acme read-only flags · bob GET initech `canManageRoles` | the UI only reads flags from the API |
| Validation | DTO: OWNER/admin/null/1 rejected | invalid role, `{}`, extra field, non-UUID userId, malformed JSON → 400 | `toMembersResponse` rejects wrong shapes |
| Business rules | self-demote 409 (no tx) · actor demoted/removed in tx 403/404 · lock 0 rows 404 · same role no-op · last-admin invariant (mocked count) · P2025 404 · P2034 409 | self-demote 409 · target not a member 404 | per-member rollback, concurrent mutations, one pending mutation per member (`canStartRoleChange`, used by the Select, ⋯, and the dialog confirm), `isRoleChange`, `roleToastId` (different id per tenant/user), error-toast description per code |
| Persistence | update uses the composite key, lock before reads | PATCH then GET shows the new role | curl against the local DB + API restart (manual, P7) |
| UI states | – | frank/wayne "only you" shape | `deriveMembersViewState` all branches, state copy matches the design, `build-org-graph` layout with the design constants |

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The assessor considers the dependencies excessive | Justification table + rejected libraries in SUBMISSION. Chart is lazy. Security lives entirely in the API. Polish features are separated (P7b). |
| A new session loads the wrong `AGENTS.md` | AGENTS.md is fixed in P1. Resend P0 in every new session. |
| A heavy phase is cut off by auto-compact | P4 and P5 are split (P4a/P4b, P5a/P5b). `/clear` + P0 before P4a and P5a. If it is still cut off: resend P0, then that phase's prompt with the "Resume:" prefix. Every phase ends with a per-step checklist (done / deviated / skipped). |
| Claude reports browser checks that were never run | Claude has no browser. P0 rule: browser checks become a checklist for the owner; Claude stops and only records the results the owner pastes ("manual (by me)"). |
| Docker/DB/API not running yet | The prompts say STOP. The migration can be created offline (`migrate diff`). Curl steps are marked pending. |
| The shadcn CLI asks interactive questions | `-y` flag. If it still asks, STOP and hand the command to the owner. |
| Library APIs have changed (shadcn v4 defaults to Base UI, TanStack Table v9, TanStack Query deprecations, Prisma v8 docs, nuqs throttle option) | Versions are pinned and the prompts name the correct APIs. Check the installed typings. |
| The org chart looks sparse (seed of 2–3 members) | The layout stays tidy for small n. The seed is not extended because TASKS locks its size. |
| cacheComponents' `<Activity>` keeps hidden state | Logout and 401 use a full reload. Dialogs are state-controlled and closed on unmount. |
| The design and the plan differ (copy, chart layout, zoom, skeleton, toast id) | Precedence is embedded in P0: the design wins for visuals, copy, and layout; the plan wins for behaviour, security, and scope. Every conflict is recorded in SUBMISSION. The P7 tests follow the design's strings and constants. |
| Time runs out | Cut P7b first, then P6 (chart; P7 then skips the chart tests/checks and removes `@xyflow/react`). P7, P8, and P9 are still run. Optional fallbacks: tooltip → `title` attribute, centring the selected card → plain `fitView` (still core, recorded in SUBMISSION). Write in SUBMISSION what is unfinished, what was tried, and the next steps. |
