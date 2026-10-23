# Submission notes: tenant members page

The fork URL and reviewer access go in the submission message at the end of this file. Hosting was skipped at the project owner's request, so there are no live URLs yet (see [Incomplete requirements and limitations](#incomplete-requirements-and-limitations)).

## What I implemented

**API (`app/api`)**

- `GET /tenants/:tenantId/members` for any member of the tenant and `PATCH /tenants/:tenantId/members/:userId` with `{ "role": "ADMIN" | "MEMBER" }` for tenant admins.
- The tenant comes from the path. `TenantMemberGuard` (`src/tenancy/`) checks the UUID and the membership in the database on every request, using only the verified JWT `sub`. The `x-tenant-id` header is ignored.
- Roles are read from the database, never from the token. The token carries `{ sub, username }` only.
- Role changes run in a transaction: lock the tenant row, re-read the actor and the target, refuse self-demotion (409), keep a last-admin invariant (409), then update by the composite key. Same role again is a 200 no-op.
- Validation: `@IsEnum(TenantRole)`, `whitelist` + `forbidNonWhitelisted`, `ParseUUIDPipe`. Every error body is `{ statusCode, error, code, message }` with a stable `code`; Prisma messages never reach the client.
- `User.status` (`ACTIVE | INVITED | SUSPENDED`, migration `add_user_status`; seed: heidi INVITED, ivan SUSPENDED).
- Login runs a bcrypt comparison for unknown usernames too, so response time doesn't reveal which usernames exist.

**Portal (`app/portal`)**

- `/dashboard/members` with a List view (name, email, role, account status, joined) and a Chart view (tenant → Admins / Members → member cards). The view, search, role filter and sort live in the URL.
- Initial load on the server inside `<Suspense>` (`lib/members.ts`), hydrated into TanStack Query. Client refetches go through a same-origin BFF route (`app/bff/tenants/[tenantId]/members`), and role changes through a Server Action (`dashboard/members/actions.ts`). The browser never sees the token and never calls the API directly.
- States: loading skeleton, load error with "Try again", page error boundary, empty fallback, only-you, no results, no access (a `?tenant=` slug you don't belong to, no request sent), and read-only roles for members.
- Role change: admins pick a role in a Select (list) or a card menu (chart). Promotion is applied at once. Demotion asks for confirmation in an AlertDialog. The update is optimistic per member, rolls back on failure, and shows a success, neutral or error toast. The viewer's own row is locked ("You can't change your own role"), and roles can't be changed while that member's previous change is pending.
- Light and dark theme follow the OS. Keyboard and screen-reader support, checked by axe in Playwright.

**Intentional enhancements beyond the stated requirements**

Each one is small, uses only data the API already returns, and needs no extra endpoint:

- **Chart view.** Lazy-loaded React Flow chunk (about 59 KB gzip), so List-only visitors don't pay for it. Covered by `build-org-graph.spec.ts` and `chart.e2e.ts` (including a check that the List view loads no React Flow chunk).
- **Search, role filter and column sort in the URL.** Covered by `member-filters.spec.ts` and `members-list.e2e.ts`.
- **Small table details.** A sticky table header, and a tooltip with the full email when it is truncated. These are a CSS class and one tooltip; they were checked in the browser during development, not by a committed test.
- **Toasts.** At most 3 at once, and each closes after 6 s. This is Sonner configuration (`visibleToasts`, `duration`) in `layout.tsx`; the toast content and ids are covered by `role-change.e2e.ts` and the role-change unit tests.

Not shipped: the optional P7b polish (chart legend, stacked mobile cards, small-screen "Switch to List" hint, Invited/Suspended card styling, chart search navigation).

## Design decisions and assumptions

**Security and authorization**

- **Tenant isolation.** The tenant is a path parameter that the guard validates against the database on every request. A malformed id, an unknown tenant and a tenant you don't belong to all return the same 404 `TENANT_NOT_FOUND`, so tenant ids can't be probed. A member calling an admin route gets 403 `NOT_TENANT_ADMIN`.
- **Authorization from the database.** There is no `tenants` claim in the JWT, so a demoted admin loses access on their next request rather than when the token expires.
- **The PATCH transaction.**
  - It re-reads the actor's role after `SELECT … FOR NO KEY UPDATE` on the tenant row, at the default READ COMMITTED isolation.
  - Two concurrent changes in one tenant run one after the other, and the second one sees the first one's result. Serializable isolation would need a retry loop for `P2034`. `P2028`/`P2034` map to 409 `ROLE_CHANGE_CONFLICT`, and `P2025` maps to 404.
- **Self-demotion and last admin.**
  - Self-demotion is refused with 409 before the transaction starts.
  - The last-admin check is an invariant guard (409 `LAST_ADMIN_REQUIRED`). The current flows can't reach it: self-demotion is refused first, and the actor is re-checked inside the transaction. It is there so that a future flow, such as removing members, can't leave a tenant without an admin.
- **BFF GET and Server Action.**
  - The token stays in an httpOnly cookie and is never sent to the browser.
  - Server Actions get Next's built-in Origin check. The BFF GET refuses any `Sec-Fetch-Site` other than `same-origin` and answers `Cache-Control: private, no-store`.
  - Upstream bodies are reduced to the contract by `toMembersResponse` / `toMemberDto`. Only an allowlist of error codes is forwarded; everything else becomes `UPSTREAM_ERROR` (502 for 5xx).
- **No `'use cache'` for authorized data.** A per-user read in a shared cache would put the token in the cache key and serve stale roles.
- **Permissions come only from the API.** `canManageRoles` and `canChangeRole` come from the API; the UI never computes permissions.
- **The Overview "Admin" panel is display-only.** The pre-existing panel (`dashboard/page.tsx`, `isAdmin = tenant.role === "ADMIN"`) gates only static sample data by the `/auth/me` role. The API enforces everything that matters.

**Product assumptions**

- **What the chart shows.** It shows Tenant → role → member, because the data has no reporting line.
- **Account status is display-only.** It is an account-level `UserStatus`: it doesn't block login or role changes yet.
- **Every member can read the list.** The PDF Background asks for "a basic member management feature that allows an authorized organization administrator to view members and update their roles". Requirement 3 restricts only *updates* to admins ("Only authorized administrators may update member roles"). So every member of a tenant can read the list, read-only, like a workspace directory. To make the list admin-only, add `@RequireTenantRole(TenantRole.ADMIN)` to the GET handler.
- **Unknown tenant slugs.** On the Members page, an unknown `?tenant=` slug shows "no access" without fetching anything. The Overview page still falls back to the first tenant as before.

**Tests and local environment**

- **Test runners: Jest and Playwright, at the project owner's instruction.** The repo shipped Vitest, and the PDF asks for "automated tests using the existing test framework". The owner chose Jest for both apps so the monorepo has a single unit-test runner, and Playwright (with axe) for the browser tests. This is a deliberate deviation from the PDF; it is also listed under [Where I disagreed](#where-i-disagreed-with-the-repo-or-my-ai).
  - API: native ESM through `--experimental-vm-modules`, with `@swc/jest` for decorators and metadata.
  - Portal: `next/jest`, `testMatch` limited to `src/**/*.spec.ts`.
- **API test harness.** The API e2e tests run the real Nest app (guards, pipes, controllers) over supertest against a Prisma mock, because CI has no PostgreSQL. The Playwright suite is the real-database check.
- **Local database: Prisma's `prisma dev` server instead of Docker Compose.** The development machine has no Docker, so I ran PostgreSQL with Prisma 7's built-in local server and pointed `DATABASE_URL` at its TCP URL. `docker-compose.yml`, `pnpm db:up` and `.env.example` are unchanged and remain the README's default; the README adds the `prisma dev` steps as an alternative. Migrations and the seed are the same for both. `prisma dev` runs PostgreSQL as PGlite, an embedded single-process build, so it is fine for development and the Playwright suite but is not evidence of how the lock behaves under real concurrent connections; Docker Compose (PostgreSQL 17) remains the reference setup.

**Dependencies (portal)**

The API gained none apart from the Jest test runner.

| Package | Why |
|---|---|
| `radix-ui`, `cn`, `class-variance-authority`, `lucide-react`, `tw-animate-css` (via the `shadcn` CLI) | Accessible primitives for Select, AlertDialog, DropdownMenu, Tooltip and ToggleGroup |
| `@tanstack/react-query` (+ devtools in dev only) | One cache per tenant shared by both views, plus optimistic updates with per-member rollback |
| `@tanstack/react-table` | Sortable table headers |
| `nuqs` | Typed, shallow URL state for view, q, role and sort |
| `zustand` | A per-tenant UI store: the selected member, collapsed groups and the pending demotion |
| `@xyflow/react` | Pan, zoom, fit view and focusable HTML nodes for the chart, lazy-loaded |
| `sonner` | Toasts with one polite live region |
| `jest`, `@playwright/test`, `@axe-core/playwright` (dev) | Unit, end-to-end and accessibility tests |

Rejected:

- `elkjs` (1.45 MB, EPL/GPL)
- `dagre` / `d3-hierarchy` (all leaves on one row)
- `d3-org-chart` (uses innerHTML)
- `react-organizational-chart` (no pan or zoom)
- `html-to-image` (out of scope)
- `@nestjs/observe` (third-party telemetry with PII)
- `helmet` / `@nestjs/throttler` (future work)
- `next-themes`, which `shadcn add sonner` installs: removed, because the theme follows the OS.

**UI design**

- The visuals come from a design I made with Claude Design from my brief. It is kept as a local reference and isn't committed.
- Its tokens are ported into `globals.css`.
- The design wins on visuals and copy; the plan wins on behaviour, security and scope.

<details><summary>Design tokens and design/prompt conflicts (full list)</summary>

- **Token changes vs the brief, with the designer's contrast reasons:**
  - muted-foreground `#67676f`, a darker `--input`, and `--primary-hover` `#4338ca` in both themes;
  - a zinc-800 dark popover plus `--popover-border`;
  - emerald-600 / amber-600 light Active / Invited dots (rose-500 Suspended kept);
  - darker light toast text;
  - new `--link`, `--destructive-hover` (red-700, because a red-500 hover drops white text to 3.76:1), `--selected-border` and `--alert-error-*`.
- **Radius scale** pinned to the design's pixels (4/6/8/12) through `@theme` radius tokens, instead of shadcn's 0.625rem-derived 6/8/10/14.
- **Copy adopted from the design:**
  - no-access without a link;
  - one "No members match" plus "Clear filters";
  - the only-you block and "No one has this role.";
  - the role option descriptions;
  - the "{name} is still a Member/an Admin." error descriptions, only for codes that don't refetch.
- **Skeleton:** 5 rows plus a title-block and toolbar placeholder.
- **Chart:**
  - cols = ceil(√n), zoom 0.2–1.6, fit padding of about 24px, and the selected card centred at 100%;
  - dimming uses the card chrome, not opacity;
  - the canvas is `70dvh` instead of `70vh`.
- **Toast id:** `role-{tenantId}-{userId}` instead of the person id.
- **Filters and selection:** q/role/sort reset on tenant change, and the selected card's group expands automatically (both missing from the mock).
- **Only-you vs no-results:** only-you wins over no-results even with an active filter (counter "0 of 1", no Clear filters button).
- **Summary line:** left blank in the error state.
- **AlertDialog:** cancels on a backdrop click.
- **View toggle:** ArrowLeft/ArrowRight switch the view.
- **Tenant switcher:** shows "Admin"/"Member" for the API enum.
- **Sonner:**
  - error toasts stay polite;
  - the close button is named "Dismiss notification" for every toast.
- **No design frame, built with the design's Empty pattern:** empty, no organizations, background refresh, chart loading.
- **Not built:** the design's preview-only knobs (theme switch, scenario props, stress dataset).
- **Tenant names:** the mock's placeholder tenant name isn't used; tenant names come from the API.
- **More conflicts:** listed with their reasons under [Where I disagreed with the repo or my AI](#where-i-disagreed-with-the-repo-or-my-ai).

</details>

## Tests I ran and their results

Run on 2026-10-23 against the local stack (API on `API_PORT` 3100, portal on 3001, PostgreSQL from `prisma dev`). The Jest suites, lints, typecheck and builds were re-run after the last code change.

| Command | Result |
|---|---|
| `pnpm --filter api lint` | oxlint (type-aware): no findings |
| `pnpm --filter api test` | 5 suites, 41 tests passed |
| `pnpm --filter api test:e2e` | 2 suites, 23 tests passed (supertest + Prisma mock) |
| `pnpm --filter api build` | `nest build` succeeded |
| `pnpm --filter portal lint` | ESLint: no findings |
| `pnpm --filter portal exec tsc --noEmit` | no errors |
| `pnpm --filter portal test` | 10 suites, 204 tests passed |
| `pnpm --filter portal build` | succeeded; `/dashboard/members` is Partial Prerender, the BFF route is dynamic |
| `pnpm --filter portal test:e2e` | 43 tests passed in 3.1 min (Playwright, Chromium, real API and PostgreSQL); the load-state tests also passed 3 repeats in a row |

**What the suites cover**

- **API unit tests:**
  - the guard: non-member 404, identity from `sub`, a spoofed header ignored, a stale JWT claim ignored;
  - the service: self-demotion, actor demoted or removed inside the transaction, lock returning 0 rows, same-role no-op, last-admin invariant, `P2025`/`P2028`/`P2034` mapping;
  - the DTO;
  - login timing.
- **API e2e tests:** 401 variants, tenant isolation (carol → acme 404, the header can't switch tenants), 403 for members including an invalid role (the guard runs before the pipe), every 400 case, 409 self-demotion, 409 `ROLE_CHANGE_CONFLICT` without Prisma text, 404 `MEMBER_NOT_FOUND`, the same-role 200 with no write, and PATCH-then-GET.
- **Portal unit tests:**
  - view-state derivation, filters, sort, summary and copy;
  - role-change helpers (rollback per member, one pending change per member, toast ids and descriptions);
  - chart layout constants;
  - contract parsing;
  - the Server Action (validation, forwarded codes, `UPSTREAM_ERROR`/`UPSTREAM_SHAPE`/`API_UNAVAILABLE`, cookie clearing);
  - the BFF route (cross-site refusal, 401/404, code allowlist, 502/503, `private, no-store` headers);
  - the `formatJoined` time-zone test, which reloads the module per zone.
- **Playwright:**
  - list columns and summary, invited and suspended members, a read-only member, only-you, no access (no request sent), no results;
  - the loading skeleton (throttled network);
  - the load error card with "Try again" (502 and offline);
  - promote and demote with the dialog and toasts;
  - cancel through Escape, the backdrop and an assistive-technology-style click;
  - a failed change rolling back, a stale admin, keyboard-only flows, focus after a promotion hides the row;
  - chart rendering and keyboard use;
  - expired sessions;
  - axe scans in light and dark.

**The README curl matrix (`Verify the members API`)** was run against the local API. All 16 steps returned the expected status and `code`:

- **Errors:** 401 ×2, 404 `TENANT_NOT_FOUND` ×2, 403 `NOT_TENANT_ADMIN`, 400 `VALIDATION_FAILED` ×4, 409 `SELF_DEMOTION_FORBIDDEN` and 404 `MEMBER_NOT_FOUND`.
- **Role changes:** promote (200, ADMIN), read back (ADMIN), restore (200, MEMBER), same role again (200).

The database was reseeded afterwards. A separate `pg` connection read `tenant_users` directly and showed bob as ADMIN after step 13 and MEMBER after step 15, and no response contained `passwordHash`.

**Other checks**

- **Accessibility:** axe (WCAG 2.0/2.1 A and AA) in light and dark on the list, chart, no-access, only-you, mobile, dialog and toast states: 0 serious or critical findings. All 38 colour pairs from the design tokens meet their contrast minimum in both themes.
- **Bundle:** the React Flow chunk (58.8 KB gzip JS + 2.8 KB CSS) is absent from the members route's first-load manifests and loads only when Chart is chosen.
- **Security greps:** no `'use cache'`, no `dangerouslySetInnerHTML`, no `x-tenant-id` outside tests, the BFF route exports only `GET`, and no `'use client'` file value-imports the API client, session or members loader.
- **Rendering:** no console errors or hydration warnings in light or dark, no light flash on a dark reload, CLS 0 under throttling, and transitions off with reduced motion.
- **Browser checks:** no manual results by me are recorded here. During development, ad-hoc Playwright scripts compared each state with the design frames in both themes at 1280, 768 and 390 px; those scripts aren't committed, and the committed Playwright suite covers the behaviour.
- **Concurrency:** concurrent role changes on different members in one tenant are verified by unit tests only, because the seed has one changeable member per tenant.

## How I used AI

- **Plan.** I wrote a phased plan (P0–P9) with Claude. It covers the decisions, the API contract, the UI states, the test matrix and the traps in the repo. Each phase ended with checks and a "done / deviated / skipped" list.
- **Design.** The UI design (tokens, page, handoff spec, frames) came from Claude Design, working from my brief.
- **Implementation.** Claude Code did the work phase by phase. I reviewed the diffs and ran every lint, typecheck and test.
- **Review.** Before submitting, a multi-agent review pass checked the work against the PDF requirements, code quality and logic. It found real bugs, which are now fixed and covered by tests:
  - "Keep as Admin" ignored assistive-technology clicks;
  - focus fell to `<body>` when a promotion hid the row under a role filter.

  It also found test gaps (the load states, the Server Action and the BFF), dead files and stale notes.
- **What I kept and what I changed.** I kept the AI's code where tests and a review backed it. I overrode it where it followed the repo's misleading guidance or the plan's assumptions; see the next section.

## Where I disagreed with the repo or my AI

- **AGENTS.md, Tenant context** said an API gateway validates the `x-tenant-id` header and told me not to add membership lookups. No gateway exists, so any client could pick a tenant. The tenant now comes from the path (`/tenants/:tenantId/members`), and `TenantMemberGuard` checks the membership in the database on every request; the header is ignored.
- **AGENTS.md, Authorization** said to use `isTenantAdmin()`, which read memberships embedded in the JWT. Those claims stay valid for up to a day after a demotion. I deleted the helper, removed `tenants` from the token (`{ sub, username }` only) and read the role from the database, again inside the role-change transaction.
- **AGENTS.md, API handlers** said `@IsString()` is enough because the portal's `<select>` constrains roles. The UI is not a security boundary, so the DTO uses `@IsEnum(TenantRole)` and the global pipe uses `whitelist` + `forbidNonWhitelisted`.
- **AGENTS.md, API handlers** said a single `prisma.tenantUser.update` is enough because a global exception filter maps Prisma errors. No such filter exists, so a missing row would have been a 500 with Prisma internals. Role changes run in a transaction that locks the tenant row and re-reads the actor and the target. It maps `P2025` to 404 and `P2028`/`P2034` to 409, each with a stable `code`.
- **AGENTS.md, Portal data fetching** said to wrap the members fetch in `'use cache'` with the session token as an argument. That puts the token in the cache key and serves stale roles after a change, so the guidance now says never to cache per-user reads.
- **AGENTS.md, Portal data fetching (a deliberate deviation):** the initial load still lives in `lib` and is called inside `<Suspense>`, as the convention says. For client refetches I added a same-origin BFF GET route, because TanStack Query refetches in the browser and the browser must never hold the token.
- **`app/api/README.md`** suggested installing `@nestjs/observe`. I didn't: it ships telemetry, including PII, to a third party and is out of scope. **`nest deploy`** (the `deploy` script) was not used either; hosting follows TASKS.md.
- **`main.ts` CORS** used `origin: PORTAL_URL`, which turns into `*` when the variable is empty. It is now `portalUrl ? [portalUrl] : false`.
- **Account status** did not exist in the schema. I added `User.status` (`ACTIVE | INVITED | SUSPENDED`, account level, default `ACTIVE`; seed: heidi INVITED, ivan SUSPENDED). It is display-only: it doesn't block login or role changes yet, so a suspended member can still be promoted.
- **Code comments:** the plan asked for a few explanatory comments (the READ COMMITTED reliance, the last-admin defense-in-depth check). The project owner asked for no code comments at all, so that reasoning lives here and in the test names instead:
  - the lock relies on the default READ COMMITTED isolation (raising it would need a `P2034` retry);
  - the last-admin check can't be reached through the current flows, because self-demotion is refused first and the actor is re-checked inside the transaction.
- **Test runner (Vitest → Jest, plus Playwright):** the repo shipped Vitest, and the plan first kept it. The project owner instructed Jest for both apps and Playwright for browser tests, so the monorepo has one unit-test runner. The API uses native ESM via `--experimental-vm-modules` and `@swc/jest` for decorators and metadata; the portal uses `next/jest` (SWC transform, `testEnvironment: "node"`, `testMatch` limited to `src/**/*.spec.ts` so Playwright files are never picked up, globals typed by `@types/jest`).
  - **This deviates from the PDF requirement** "automated tests using the existing test framework". I followed the owner's instruction and record it here rather than hide it.
  - **No existing test was removed or disabled.** `test/app.e2e-spec.ts` booted the real app and needed PostgreSQL, which CI doesn't have. It is edited in place to override `PrismaService` with the mock, and it keeps its `GET /` assertion.
- **Lint config:** `typescript/unbound-method` is turned off only for `*.spec.ts` and `test/**`. Asserting on mock methods (`expect(prisma.tenantUser.update)`) is the normal Jest pattern, and the rule can't tell it apart from a real unbound call.
- **Members list default sort (P5a):** the plan said the default row order is the API order (admins first), but every design frame shows the Name column as the active ascending sort. The design wins on visuals, so a missing `sort` param means `name.asc`. Every sort still falls back to name, then `userId`, so the order is stable.
- **Only-you vs. no-results precedence (P5a):** the mock shows the "You're the only member" block only without filters. I kept the plan's precedence: only-you wins even when a filter hides your own row (counter "0 of 1"), because "no members match" would wrongly suggest other people exist.
- **Error state summary (P5a):** the design keeps "Loading members…" in the summary line while the load-error card shows. That reads as a bug, so the summary is empty in the error and no-access states.
- **View toggle arrow keys (P5a):** the shadcn/Radix ToggleGroup only moves focus with ArrowLeft/ArrowRight. The design switches the view on arrow keys (radio-group behaviour), so the items handle those keys themselves and move focus to the newly selected item.
- **Loading skeleton (P5a):** the design hides the toolbar while loading.
  - The Suspense fallback keeps a toolbar-height placeholder so nothing jumps when data arrives.
  - It shows a title bar instead of the tenant name, because the fallback can't know the tenant yet.
  - An ad-hoc Playwright measurement (not a committed test) showed no shift at 1280px. At 390px, a tenant name that wraps to two lines still pushes the content down by one line.
  - The committed `members-states.e2e.ts` checks that the skeleton shows and is replaced by the table.
- **Role filter control (P5a):** the design draws a native `<select>`; the plan asked for the shadcn Select, which I kept for consistency with the role control.
  - It opens as a popper under the trigger, so the "Role:" prefix stays visible.
  - It is at least 145px wide, like the native one.
  - It is named by its "Role:" prefix through `aria-labelledby`, because axe flagged the Radix combobox as unnamed.
- **Focus rings were invisible app-wide (P5a):** the shared shadcn components combined `outline-none` with `focus-visible:outline-2`. In Tailwind 4, `outline-none` sets `--tw-outline-style: none`, which `outline-2` then reads, so no ring was ever drawn (computed `outline-style: none` on every focused control).
  - I removed `outline-none` from Button, Input, the Select trigger and items, TableRow, Toggle, the header nav links and the tenant switcher.
  - Keyboard focus now shows the designed 2px ring.
- **`error.tsx` (P5a):** the plan said "reset"; Next 16 documents `retry()` (re-fetch and re-render) as the default and `reset()` only for special cases, so the boundary uses `retry()`. The boundary replaces the whole page segment, so the header isn't shown there.
- **Tampered session cookie (P5a):** the plan expected a server-side redirect to `/login`. With `cacheComponents`, `getCurrentUser()` must run inside `<Suspense>`, so the shell is already streaming. Next therefore emits the redirect in the stream (HTTP 200 + `<meta http-equiv="refresh">` and an RSC redirect) instead of a 307. The browser lands on `/login` without rendering any member data, the same as the existing Overview page.
- **Small structural deviations (P5a):**
  - The Zustand store file is `members-ui-store.tsx`, because it contains the provider's JSX.
  - The page `<main>` adds `w-full`, because `mx-auto` inside the flex-column page wrapper would otherwise shrink to its content.
  - The design's `max-w-[260px]` on the Email cell is kept, but browsers ignore `max-width` on table cells in auto layout. Long emails therefore truncate at the column width the table picks. The full-email tooltip still appears on hover and on row focus.
- **Error toast description (P5b):** the design's error frame (D15) shows "Bob Brown is still a Member." under "You no longer have permission to change roles.". I kept the plan:
  - The "{name} is still …" line appears only for errors that don't refetch: self-demotion, last admin, server unreachable and the generic error.
  - For NOT_TENANT_ADMIN, MEMBER_NOT_FOUND, TENANT_NOT_FOUND and ROLE_CHANGE_CONFLICT, the list is refetched at once. The server data is what the page shows, so the toast has no description.
- **Toast id (P5b):** the design keys toasts by person; the toast id is `role-{tenantId}-{userId}`. A newer result for the same person replaces the old toast, and the same user changed in two organizations gets two toasts.
- **Toast close-button name (P5b):** the design names it "Dismiss notification: {title}". Sonner 2.0.8 only accepts `closeButtonAriaLabel` for the whole Toaster, not per toast, so every close button is named "Dismiss notification". Error toasts are announced through Sonner's single polite "Notifications" region instead of `role="alert"`, so there is still only one live region.
- **Unreachable portal during a role change (P5b):** if the Server Action request itself fails (offline, portal down), the action never returns a typed result. The hook maps that to `API_UNAVAILABLE` ("Can't reach the server. Please try again." + "{name} is still a Member.") instead of the generic message, and rolls the row back.
- **Keyboard selection into the demote dialog (P5b, revised after review):**
  - **The bug:** choosing "Member" with Enter in the Radix Select opened the dialog and moved focus to "Keep as Admin" while the key was still down. The browser then activated that button and the dialog closed at once (Playwright reproduced it).
  - **My first guard was too broad.** It ignored every keyboard-style click (`detail === 0`) on "Keep as Admin" unless a key had been pressed inside the dialog. That also blocked screen-reader and voice-control activation (NVDA browse mode, VoiceOver, `element.click()`), so the safe choice did nothing for those users.
  - **The dialog now remembers which keys were held at the moment it opened.** It ignores a keyboard-style click on "Keep as Admin" only until those keys are released.
  - **Tests:** the keyboard e2e test covers the Enter leak. The cancel test closes the dialog with an assistive-technology-style `element.click()`.
- **Self row lock badge (P5b):**
  - As in the design, the viewer's own row shows the lock badge for every viewer; Bob sees it on his own Member badge too.
  - The reason "You can't change your own role" sits in an sr-only element outside the button and is linked with `aria-describedby`, so the button name stays "Admin"/"Member".
  - The visible tooltip is `aria-hidden`, so screen readers don't hear the reason twice.
- **RoleControl API (P5b/P6):** the plan's signature was `{ member, tenantId, variant }`. It also takes `tenantName`, because the toasts and the dialog name the organization. The `select` (list) and `menu` (chart) variants share one `useRoleChoice` hook.
  - The dialog has no Trigger. It returns focus through the stable id `role-trigger-{userId}`, falling back to the chart node and then the search box (`role-focus.ts`).
  - If a promotion makes the edited row disappear under the active role filter, the Select's unmount moves focus to the same fallback, so focus never falls to `<body>`.
- **Role option descriptions (P5b):** the two-line SelectItem first linked its description with `aria-describedby`. axe 4.14 later flagged that (see "Select option names (P7)").
- **Chart canvas height (P6):** the design uses `min(70vh, 720px)`; the canvas uses `70dvh`, so the mobile URL bar can't push the controls below the fold.
- **Card positions inside a group (P6):** the plan's formula places a card at `PAD + col × (240 + 16)` from the group's outer edge. The design positions cards inside the group's 1px border, so every card in the design sits 1px further right and down. I added the border to the offset. Measured with Playwright, card, avatar and text positions now match the design frames to the pixel.
- **Edges (P6):** with React Flow's default 6px handles and a smoothstep `offset` of 20, the edges started 3px below the tenant card and stopped 3px above the groups, and the 12px corner radius shrank to 4.5px. The handles are now zero-size and invisible, and `pathOptions` is `{ borderRadius: 12, offset: 0 }`, so the path runs 80 → 112 → 144 like the design.
- **Background dots (P6):** the plan said `<Background size={1}>`, which draws 1px dots that almost vanish. The design's dots are `radial-gradient(var(--border) 1px …)`, which is 2px across, so `size={2}`.
- **Zoom controls (P6):** the plan said `<Controls showInteractive={false} />`. Its buttons use filled 12px glyphs, and its panel can't take a role. The design shows 20px stroke icons in a `role="toolbar"` named "Zoom". I render the same three buttons ("Zoom in", "Zoom out", "Fit view") in a React Flow `<Panel>` with lucide icons.
- **Card menu is non-modal (P6):** with Radix's default modal DropdownMenu, the page behind the menu ignores the pointer and the wheel, so "panning closes an open card menu" could never happen. The card menu is `modal={false}`: a wheel, pinch or drag on the canvas starts a move, and `onMoveStart` closes the menu. Clicking outside or pressing Escape still closes it and returns focus to the ⋯ button.
- **Card menu focus (P6):** shadcn's `DropdownMenuContent` doesn't accept `onOpenAutoFocus`, so the checked radio item gets focus one frame after the menu opens, as the design asks.
- **Entering the chart with a selection (P6):** my first version called `fitView` as soon as the chart mounted. React Flow hadn't measured the pane yet, so the call did nothing, and the selected card was never centred or focused. The framing now waits until the pane has a size, then centres the card at 100% and focuses its node.
- **Screen-reader names in the chart (P6):**
  - React Flow always adds `aria-roledescription="node"` to nodes. That is removed through `domAttributes`, so cards are announced as groups, as in the design.
  - The design counts only the visible cards in the canvas label, so a collapsed group read "0 admins"; the label uses each role's total instead.
  - Group nodes are in the Tab order (tenant → Admins → its cards → Members → its cards), as the plan asks.
- **RoleControl `menu` variant (P6):** it lives in `role-control.tsx` next to the `select` variant, so Radix DropdownMenu is in the page's eager bundle. Only React Flow and its CSS are lazy: one 58.8 KB gzip JS chunk plus 2.8 KB of CSS, loaded only in Chart view.
- **Touch targets in the chart (P6):** the ⋯ button and the group chevrons are 40×40 below 640px, as designed, but they live on the zoomable canvas. At the 390px fit zoom (0.525), they appear about 21px on screen, as in frame M3. The planned small-screen "Switch to List" hint (P7b) was not built, so this remains a limitation; the List view is the accessible path on phones.
- **`server-only` stays a guard in Jest (P7):** `next/jest` maps `server-only` to an empty module. The plan says not to mock it, so `jest.config.mjs` maps it back to the real package. The Server Action and BFF specs mock `@/lib/api` and `@/lib/session` explicitly instead.
- **Card offsets in the graph tests (P7):** the plan's test spec says cards sit at `x = 24 + col × 256`, `y = 68 + row × 88`. The tests assert `25 + col × 256` and `69 + row × 88`, the 1px group border included, because that is what P6 measured against the design frames.
- **Select option names (P7):** in P5b the role option's description was linked with `aria-describedby`, and the name stayed "Admin".
  - axe 4.14 flags that as `label-content-name-mismatch` (serious, WCAG 2.5.3) in both themes, because the visible text isn't part of the name.
  - The option now takes its name from its content. The trigger still shows only the role.
  - The open-Select scan turns off only `aria-hidden-focus`: Radix `hideOthers` sets `aria-hidden` on the page behind the listbox, but focus is trapped in the listbox.
- **Playwright runs against the real local stack (P7):** AGENTS.md says tests don't touch the database, and that still holds for every Jest suite. The Playwright suite is a local end-to-end check and needs PostgreSQL, so it's not meant for the current CI.
  - `webServer` reuses the running API and portal, and `workers: 1` keeps the order fixed.
  - `globalSetup` and `globalTeardown` run `pnpm db:seed`, and every test that changes a role reseeds in `afterEach`.
  - The suite needs exclusive use of the database while it runs.
- **Toast contrast in axe (P7):** axe measured the success toast in the middle of Sonner's enter transition and reported 3.38:1 (blended colours). The finished toast is 5.22:1 in light and 12.30:1 in dark. The toast scan now waits for the toast's animations to finish.
- **Session expiry in e2e (P7):** waiting a day for the JWT to expire isn't practical, so the tests replace the session cookie with an invalid token.
  - A role change then goes to `/login` with no failure toast and no write.
  - A background refetch also goes to `/login`: Playwright's clock moves past the 30 s `staleTime`, a `visibilitychange` follows, and the BFF answers 401.
- **Persistence check without restarting the API (P7):** the plan's step "restart the API, then GET again" was replaced, because the dev servers have to stay up.
  - After the PATCH, a separate `pg` connection reads `tenant_users` directly and shows bob as ADMIN; the PATCH back then shows MEMBER.
  - The e2e test "a promotion persists across reloads" covers the UI side.
- **Playwright artifacts (P7):** `outputDir` points to the OS temp folder, so traces and screenshots never land in the repo. The root `.gitignore` gained only `.swc`, the `next/jest` SWC cache.
- **Generated shadcn files (review):** `shadcn add` wrote files without semicolons, while the rest of the portal uses them. The portal now has a `.prettierrc` (`semi: true`), and the generated components are formatted to it; run Prettier again after any future `shadcn add`. `card`, `popover`, `separator` and `skeleton` were never used, so they were deleted. `popover` was only meant for the P7b legend.
- **Loading and error states are now e2e-tested (review):** the review found that the skeleton, the load-error card and "Try again" were covered only by unit tests of the state derivation. `members-states.e2e.ts` now covers them:
  - the skeleton under a throttled network;
  - a 502 and an offline BFF after a background refetch, with the retry count;
  - "Try again" showing `aria-busy` and recovering.

  The empty state stays unit-tested only, because the API can't produce it.

## Incomplete requirements and limitations

- **Hosting is not done.** The project owner skipped the Railway/Vercel step, so there are no live portal or API URLs, and the "To do: hosting" boxes in TASKS.md are unticked. Next steps, as in TASKS.md:
  1. Create the Railway Postgres and API service with build `pnpm install --frozen-lockfile && pnpm api:build`, pre-deploy `pnpm db:deploy` (applies `add_user_status`) and start `pnpm api:start`.
  2. Set `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=1d` and `PORTAL_URL`.
  3. Seed through the public database URL, then check that `curl` login returns a token.
  4. Create the Vercel project with Root Directory `app/portal` and `NEXT_PUBLIC_API_URL`, then set `PORTAL_URL` on Railway.
  5. Add both URLs to TASKS.md and the README.
- **No git history in this working copy.** The work was done in an unpacked copy of the repo, so the `git ls-files` secret checks could not run; the root `.gitignore` covers `.env*` except `.env.example`. The project owner sets up the private fork and adds `tenant-portal-member-orgchart-plan.md` and `design reference/` to `.git/info/exclude` (not `.gitignore`), so the working plan and the local design files are never committed.
- **Functional requirements:** none of the members-page requirements is unmet.
- **Account status is display-only.** A SUSPENDED user can still sign in and be promoted.
- **The empty state can't be reached through the API.** The viewer is always a member of the tenant, so a list is never empty. It is a defensive fallback with unit coverage only (`members-view-state.spec.ts`, `members-copy.spec.ts`).
- **The page-level error boundary (`dashboard/members/error.tsx`) isn't e2e-tested.** It only renders when a server component throws, which the e2e suite can't trigger without stopping the API.
- **The Overview "Admin" panel is display-only.** It is the pre-existing panel, gated by the `/auth/me` role and showing static sample data.
- **The Playwright suite needs the local API, portal and PostgreSQL, plus exclusive use of the database.** It reseeds the database, and the seed is not one transaction. It is not part of CI.
- **No real-database test of the lock path.** The API e2e suite uses a Prisma mock.
- **Seed size.** It is fixed by TASKS.md, so the chart only ever shows 1–2 cards per group.
- **Malformed JSON.** A malformed JSON body gets Nest's default 400 without `code` (`{"message":"Unexpected end of JSON input",…}`). The portal never sends one.
- **P7b polish was not built.** That covers the chart legend, stacked mobile cards, the small-screen hint, Invited/Suspended card styling and chart search navigation.

## Remaining risks

- **Stale identity.** The JWT identity stays valid until it expires (1 day) even if the user is suspended; roles, though, are always read fresh.
- **No login rate limit.** Timing no longer reveals usernames, but passwords can still be guessed without limit.
- **No pagination.** The whole member list is sent to the client, which is fine for the seed but not for large tenants.
- **Dependency surface.** The portal has several UI and state libraries; each is justified above, and the chart is lazy.
- **Error-path refetch.** An immediate refetch after an error code (for example `ROLE_CHANGE_CONFLICT`) can briefly show another member's pending optimistic role as its old value, until that member's own change settles.

## What I'd improve before production

1. **Enforce account status at login and in the guard,** and add token revocation or a shorter TTL. Status is shown but not enforced today.
2. **Rate-limit login** (`@nestjs/throttler`, per IP and per username) to stop online password guessing.
3. **Add a real-database integration test for the concurrent PATCH path,** and run Playwright in CI against a dedicated database. The lock and the isolation level are currently tested only with mocks.
4. **Keep an append-only role-change audit trail** (actor, from, to, at), written in the same transaction, with a per-member history view. Also log refused attempts (403/404/409: ids and code only, no PII). Admins need to know who changed what.
5. **Move search, filter, sort and pagination to the server,** and virtualize the list. For the chart, use a MiniMap, `onlyRenderVisibleElements` and group capping, so large tenants stay fast.
6. **Have the server send lock reasons** (for example `roleLockReason: SELF | NOT_ADMIN`), so the UI can explain every locked action as roles grow.
7. **Make the UX status-aware** once status is enforced: a status filter and "resend invite".
8. **Add undo, and notify the affected member** of a role change.
9. **Add CSP and security headers** (helmet, Next headers).
10. **Share API contract types between the API and the portal,** and give malformed JSON a `VALIDATION_FAILED` code.

## Submission message

Ready to paste once the fork exists. Replace the placeholders; if hosting is still skipped, keep the "not deployed" line instead of the two URLs.

```text
Hi,

Here is my submission for the Tenant Member Management assessment.

- Repository (private fork, reviewers added as collaborators): <FORK_URL>
- Portal: <PORTAL_URL>   (not deployed yet: hosting was skipped at the project owner's request)
- API: <API_URL>         (not deployed yet: hosting was skipped at the project owner's request)
- Submission notes: <FORK_URL>/blob/<DEFAULT_BRANCH>/SUBMISSION.md
- Where I disagreed with the repo or my AI: <FORK_URL>/blob/<DEFAULT_BRANCH>/SUBMISSION.md#where-i-disagreed-with-the-repo-or-my-ai

Summary: a members page at /dashboard/members (List and Chart views) with role changes for tenant admins. The API takes the tenant from the path and checks membership and role in the database on every request (the x-tenant-id header and JWT role claims are not trusted), validates roles with @IsEnum, and runs role changes in a locked transaction that refuses self-demotion. Tests: API Jest 41 unit + 23 HTTP, portal Jest 204 unit, Playwright 43 end-to-end with axe in light and dark. Run instructions are in the README.

Thanks,
<YOUR_NAME>
```
