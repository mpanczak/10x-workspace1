---
project: slipstream
plan_status: in-progress
cloudflare_account_email: jd7552820@gmail.com
cloudflare_account_id: 4cdb171bd7259f549e48bec9dc4747d4
planned_at: 2026-07-07
infrastructure_ref: context/foundation/infrastructure.md
prd_ref: context/foundation/prd.md
tech_stack_ref: context/foundation/tech-stack.md
---

# Cloudflare Backend Integration & Deployment — slipstream

## Context

`context/foundation/infrastructure.md` (researched 2026-07-04) picked the platform: **Cloudflare Workers + Durable Objects + D1 + R2**, with **Hono** as the routing framework, driven by the PRD's realtime-chat requirement and the project's cost-sensitivity. Before this plan, the repo was a pure Expo Router client — no backend, no `.github/workflows/`, no `.env` handling, no CI.

This document is the audit-trail artifact for that deploy decision, per this repo's own `CLAUDE.md` convention (Plan Mode plans the deploy; the approved plan is persisted here so downstream milestone-planning has ground truth for "what's already deployed and which secrets are already wired").

**Locked-in scope decisions:**
- **Auth**: email+password + Google OAuth for MVP. Shipping Google OAuth on iOS triggers Apple Guideline 4.8, which in practice requires Sign in with Apple too — **accepted as a tracked follow-up to resolve before the first App Store submission**, not built in this pass.
- **Realtime chat (FR-012)**: kept as a deferred phase (Phase 5) since it's architecturally tied to the Durable Objects decision, but not required for either PRD success-criteria path.
- **Execution scope**: Phases 0–4 (external setup → backend scaffold → D1 data layer → auth → rides/participants API) were intended to produce a working preview Worker. Expo client wiring (Phase 6), CI/CD (Phase 7), verification (Phase 8), chat (Phase 5), and this artifact's own upkeep (Phase 9) follow in later sessions.

No monorepo tooling exists and none is being introduced — the backend lives at `backend/` as a fully independent sibling project (own `package.json`, own `wrangler.jsonc`), not an npm workspace member.

---

## Current status (as of 2026-07-13)

**Phases 0, 1, 2, and 3 are executed. Stopped before starting Phase 4.**

- **Phase 3 (Auth) done**: better-auth `1.6.23` + `@better-auth/drizzle-adapter` + `@better-auth/expo` wired against D1 via `drizzle-orm/d1`. `backend/src/lib/auth.ts` exports the runtime `getAuth(env)` factory (constructed per-request); `backend/src/lib/auth.cli-config.ts` is the CLI-only plain `auth` export used solely by `@better-auth/cli generate`. Mounted at `app.on(['GET','POST'], '/api/auth/*', ...)` in `backend/src/index.ts`.
  - Schema: `users`/`sessions`/`accounts`/`verifications` tables (plural, `usePlural: true` to match the app's existing plural naming) generated via `@better-auth/cli generate` into a **separate temp file** (`src/db/auth-schema.ts`), then hand-merged into `src/db/schema.ts` and the temp file deleted — the CLI's `generate --output` is confirmed destructive/overwriting against a file with unrelated existing tables (would have wiped `rides`/`ride_participants`/etc had it targeted `schema.ts` directly).
  - Migration `0002_better_auth_tables.sql` applied local → preview-remote → prod-remote, all confirmed clean (`No migrations to apply!`). Pre-existing app-table columns (`motorcycle_profiles.user_id`, `rides.organizer_id`, `ride_participants.user_id`, `organizer_messages.sender_id`) were **left as plain `text`, not given a live FK constraint** to `users.id` — adding one now would require a SQLite table-rebuild migration against already-applied tables; deferred until a migration touches those tables anyway for another reason.
  - `BETTER_AUTH_URL` added to `wrangler.jsonc` as a plain `vars` entry (not a secret) per environment — production `https://slipstream-api.jd7552820.workers.dev`, preview `https://slipstream-api-preview.jd7552820.workers.dev`. `BETTER_AUTH_SECRET`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set via `wrangler secret put` (human-run, both top-level/production and `--env preview`, distinct `BETTER_AUTH_SECRET` per environment). `backend/.dev.vars` filled locally (gitignored).
  - **Google Console now has two registered redirect URIs on the same Web application client**: the production callback (from Phase 0) plus `https://slipstream-api-preview.jd7552820.workers.dev/api/auth/callback/google`, added during this phase to unblock preview OAuth.
  - Verified end-to-end on **both** production and preview: email+password sign-up/sign-in (200, row lands in the respective D1), and Google OAuth redirect construction (`sign-in/social` response `url` has the correct `client_id` and environment-correct `redirect_uri`, matching the registered Google Console URIs). Full Google consent click-through not exercised (needs a real browser + Testing-status test user) — deferred to Phase 8.
  - Smoke-test rows were deleted from both D1s afterward — no test data left in either database.
  - See Phase 3 Edge Cases (below) for the module-init crash risk that was checked and ruled out, and the CLI version-drift finding.

- Cloudflare account: a **new, dedicated account** (`jd7552820@gmail.com`, account ID `4cdb171bd7259f549e48bec9dc4747d4`) was created specifically for this project + Google OAuth, replacing an earlier account (`panczakmateusz@gmail.com`, account ID `a4a1d5b9cba52e7b98010bcaa4c9473c`) used during initial testing. The old account has an orphaned test deployment of `slipstream-api` — left as-is (free tier, no cost), not deleted.
- Wrangler is authenticated locally against the new account via `wrangler login` (OAuth). `workers.dev` subdomain (`jd7552820.workers.dev`) registered for both Production and Preview environments.
- `app.json` / `package.json` renamed from the `.bootstrap-scaffold`/`bootstrap-scaffold` placeholders to `slipstream` (name/slug/scheme); `package-lock.json` regenerated to match. `app.json` also now has `ios.bundleIdentifier` / `android.package` = `com.slipstream.app` (added ahead of Google OAuth client creation).
- `backend/` scaffolded via `create-hono` (confirmed real Hono template — see Phase 1 Edge Cases), deployed and verified: `https://slipstream-api.jd7552820.workers.dev/health` returns `{"status":"ok"}` (HTTP 200).
- D1 databases `slipstream-db` / `slipstream-db-preview` created and bound (see Phase 2 below, done).
- **Google OAuth, partially done**: consent screen configured (External, Testing status, test users added) on the `jd7552820@gmail.com` Google Cloud project; a **Web application** OAuth client was created with redirect URI `https://slipstream-api.jd7552820.workers.dev/api/auth/callback/google` (Client ID + Secret saved by the user outside the repo, not in chat). **Not yet done**: iOS/Android OAuth clients (deferred — Android needs a keystore SHA-1 that doesn't exist locally yet; see Phase 0 Decisions). This is enough to unblock starting Phase 3's backend-side work.
- **Known edge case hit during this deploy**: after switching Cloudflare accounts, `wrangler deploy` kept targeting the *old* account and failing with `Authentication error [code: 10000]`, even though `wrangler whoami` correctly showed the new account. Root cause: Wrangler caches the resolved account in `backend/node_modules/.cache/wrangler/wrangler-account.json` (keyed by the nearest `node_modules`), independent of the OAuth session. Fix: delete that cache file after switching accounts; Wrangler re-resolves via `/memberships` on the next run. Also hit a transient `SSL alert handshake failure` calling `/health` immediately after first enabling the workers.dev subdomain — resolved itself within about a minute (edge cert/routing propagation delay), not a real failure.

The lessons learned during an earlier proof-of-concept pass (before this execution) are kept below (in each phase's Edge Cases) since they're still true — treat them as pre-flight warnings alongside the new ones above.

**Known repo-state quirk found during that session**: `npm audit` on the Expo app's dependency tree reported 20 vulnerabilities (1 low, 16 moderate, 2 high, 1 critical) — higher than the "4 moderate, 0 critical/high" recorded in `context/changes/bootstrap-verification/verification.md` at bootstrap time. Not investigated as part of this plan (out of scope for backend infra work), but worth a look before shipping.

---

## Decisions to confirm/apply while executing

- [x] **Naming**: backend directory `backend/`, Worker name `slipstream-api` + `slipstream-api-preview` env (done — D1 databases and `ChatRoom` DO class not yet created, that's Phase 2/5).
- [x] **Environments**: `wrangler.jsonc` top-level block = production; `env.preview` block = preview added (D1 binding still to come in Phase 2).
- [x] **Placeholder rename**: `app.json`'s `name`/`slug`/`scheme` and `package.json`'s `name` renamed to `slipstream`; `package-lock.json` regenerated to match.

---

## Phase 0 — Prerequisites & External Account Setup

**Goal**: Cloudflare account/token and Google OAuth app exist and are scoped correctly before backend code depends on them.

- [x] (MANUAL — human) Create/confirm the Cloudflare account to use. **Done, revised**: a fresh dedicated account (`jd7552820@gmail.com`) was created mid-execution, replacing the account first used for testing (`panczakmateusz@gmail.com`) — see Current Status above for why and what's orphaned on the old account.
- [x] (MANUAL — human) Authenticate locally via `wrangler login` (OAuth) — used instead of a standalone scoped API token for local dev, per Phase 0's own Option A/B guidance below. A scoped API token (Workers Scripts: Edit + D1: Edit only) is still the right call for **CI** (Phase 7) and should be created then, separately from this OAuth session.
- [x] (MANUAL — human) Note the Cloudflare Account ID: `4cdb171bd7259f549e48bec9dc4747d4`.
- [x] Rename placeholders: `app.json` → `expo.name`/`expo.slug`/`expo.scheme` = `"slipstream"`; `package.json` → `name` = `"slipstream"`. Done; `package-lock.json` regenerated to match. A prior pass confirmed the only other repo references to the old placeholder name are in the 10x-bootstrapper skill's own generic docs and the historical `bootstrap-verification/verification.md` audit record — neither should be touched.
- [x] (MANUAL — human, **partially done**) Register a Google Cloud OAuth app on the `jd7552820@gmail.com` account: consent screen (External, Testing, test users added) done; **Web application** OAuth client done (redirect URI `https://slipstream-api.jd7552820.workers.dev/api/auth/callback/google`). **Still pending**: iOS + Android OAuth clients — `app.json` now has `com.slipstream.app` as bundle ID/package ready for them, but Android also needs a keystore SHA-1 that doesn't exist locally yet (no `~/.android/debug.keystore`); defer to Phase 6 (EAS credentials) or generate a debug keystore by hand. Not blocking Phase 3 start; the exact final redirect-URI shape (Web-only vs. also needing `slipstream://` registered) is still to be confirmed against current `expo-auth-session`/better-auth Expo plugin docs once Phase 3's code is written.
- [ ] Wire secrets once they exist: GitHub Actions repo secrets for CI (Phase 7), `backend/.dev.vars` for local dev, `wrangler secret put` for production (Phase 3).

### Configuring the Wrangler CLI locally

Wrangler doesn't need a global install — Phase 1 pins it as a devDependency inside `backend/`, and `npx wrangler <command>` works from any directory in the meantime (useful for the auth steps below, which can run before `backend/` exists). Node 18+ is required; check with `node --version` first.

There are two ways to authenticate, pick one:

- [x] **Option A — interactive OAuth login (recommended for local dev)**: **used.** (MANUAL — human, run directly in your own terminal, not via an automated agent tool call) `npx wrangler login`. This opens your default browser to Cloudflare's OAuth consent screen; approving it writes a token to a local Wrangler config file (on this Windows machine: `%APPDATA%\xdg.config\.wrangler\` — Wrangler follows the XDG config convention even on Windows). This step **cannot be run by an automated tool call** — completing the browser consent screen needs real-time human interaction, and a prior automated attempt in this session timed out waiting for the callback.
- [ ] **Option B — API token env var (needed for CI, works for local too)**: use the scoped token created above. Set it as `CLOUDFLARE_API_TOKEN` in your shell — PowerShell (session-only): `$env:CLOUDFLARE_API_TOKEN = "<token>"`; PowerShell (persistent, current user): `setx CLOUDFLARE_API_TOKEN "<token>"` then open a new terminal; Git Bash (session-only): `export CLOUDFLARE_API_TOKEN=<token>`. Precedence note: Wrangler checks `CLOUDFLARE_API_TOKEN` first, then `CLOUDFLARE_API_KEY`+`CLOUDFLARE_EMAIL`, then a `wrangler login` OAuth token — if both a token env var and a prior `wrangler login` session exist, the env var wins. Deferred to Phase 7 (CI).
- [x] **Verify**, regardless of which option was used: `npx wrangler whoami` — should print the authenticated account's email and the account ID(s) it can access. Confirm the account ID printed matches the one noted above. Confirmed against `jd7552820@gmail.com` / `4cdb171bd7259f549e48bec9dc4747d4`.

**Edge cases**
- If a token is pasted into chat by accident: treat as compromised, rotate immediately (human-only), never store the leaked value anywhere in the repo.
- If Google's OAuth app-verification review is slow: use "Testing" publish status with explicit test users so later phases aren't blocked.
- If `wrangler whoami` reports being authenticated as the wrong account/token (e.g. a stale `CLOUDFLARE_API_TOKEN` left over from an earlier test): a known Wrangler behavior is that a set `CLOUDFLARE_API_TOKEN` env var always wins over `wrangler login`, even if you intended to switch to the OAuth session — unset the env var (`Remove-Item Env:\CLOUDFLARE_API_TOKEN` in PowerShell, or close and reopen the terminal if it was set via `setx`) if you want the OAuth login to take effect instead.
- Don't set `CLOUDFLARE_API_TOKEN` via `setx` (persistent) if you also plan to `wrangler login` for day-to-day local dev — the persistent env var will silently shadow the OAuth session in every new terminal, which is confusing. Prefer: OAuth login for local dev (Option A), token env var scoped only to CI (GitHub Actions secret, Phase 7) — don't mix both persistently on the same machine.
- **Switching Cloudflare accounts mid-project (hit during this execution)**: `wrangler whoami` reflecting the new account is **not sufficient** proof that `wrangler deploy` will target it. Wrangler separately caches the resolved account ID in `<nearest-node_modules>/.cache/wrangler/wrangler-account.json` (here: `backend/node_modules/.cache/wrangler/wrangler-account.json`), independent of the OAuth session file. After `wrangler login` under a new account, delete that cache file (or the whole `.cache/wrangler` folder) before the next deploy, or it silently keeps targeting the old account and fails with `Authentication error [code: 10000]`.
- **Transient SSL handshake failure right after first enabling workers.dev**: hitting a freshly-deployed `*.workers.dev` URL immediately after enabling the subdomain in the dashboard can return `SSL alert handshake failure` / `ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE` for roughly the first minute (edge cert/routing propagation). DNS resolves fine during this window; only the TLS handshake fails. Retry after ~30-60s rather than assuming the deploy is broken.

**Done when**: Cloudflare token + account ID exist outside the repo; `npx wrangler whoami` confirms local CLI authentication against the correct account; Google OAuth client ID(s) exist matching the `slipstream://` scheme; `app.json`/`package.json` renamed. **Status: all done except Google OAuth client ID(s), which are not yet registered.**

---

## Phase 1 — Backend Project Scaffold *(done)*

**Goal**: A deployable, empty Hono-on-Workers project at `backend/`.

- [x] Scaffold via `npx create-hono@latest backend --template cloudflare-workers --pm npm --install` — **do not use `create-cloudflare --framework=hono`** (see Edge Cases: confirmed broken in a prior attempt). Confirmed this run produced a real Hono app (`hono` present as a runtime dependency in `backend/package.json`).
- [x] Rename the Worker's `name` in `backend/wrangler.jsonc` to `slipstream-api`.
- [x] Confirm `wrangler` is pinned as a local devDependency in `backend/package.json` (not a global install) — keeps local/CI Wrangler versions resolvable to the same lockfile version. (`^4.4.0`, resolved to `4.110.0`.)
- [x] Add an `env.preview` block to `backend/wrangler.jsonc` (Worker name `slipstream-api-preview`); D1 binding for it added in Phase 2.
- [x] Enable `"compatibility_flags": ["nodejs_compat"]` in `wrangler.jsonc` — needed by better-auth in Phase 3, cheap to turn on now.
- [x] Create `backend/.dev.vars.example` (committed, placeholder values only: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- [x] Confirm `backend/.gitignore` (from the `create-hono` template) covers `.dev.vars`/`.env`. Confirmed as-is from the template, no changes needed.
- [x] Add a root-level `.gitattributes` enforcing LF for `.dev.vars*` — Wrangler's `.dev.vars` parser is picky about CRLF on Windows checkouts.
- [x] Add a basic `/health` route to `src/index.ts`.
- [x] First deploy: `wrangler deploy` from `backend/`; confirm the `*.workers.dev` URL responds on `/health`. Live at `https://slipstream-api.jd7552820.workers.dev/health` → `{"status":"ok"}` (200).

**Edge cases**
- **`create-cloudflare --framework=hono` doesn't work reliably** — confirmed via two independent attempts (once via `npm create cloudflare@latest`, once via direct `npx create-cloudflare@latest`), both silently fell back to the default Hello-World-with-assets template regardless of the flag, with no `hono` dependency at all. This matches a known class of issue reported against `cloudflare/workers-sdk` (C3 dispatching to Hono's own `create-hono` tool doesn't reliably pass through the desired template argument). Use `npx create-hono@latest backend --template cloudflare-workers --pm npm --install` directly instead — confirmed to produce a real Hono app with `hono` as a runtime dependency.
- Windows: Wrangler officially supports Windows 11 (this machine). Expect a trailing `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` crash message from `npm create`/`npx create-hono` on process exit — this is a known Windows-specific Node/npm child-process cleanup bug, unrelated to whether the scaffold itself succeeded. Verify the actual output files rather than trusting the exit code/absence of a crash message.
- `rm -rf` is blocked by this environment's permission policy even after conversational approval. If a scaffold attempt needs discarding, use `mv` to relocate it out of the repo rather than trying to delete it in place.
- If `wrangler deploy` fails on auth here: the CLI should already be authenticated from Phase 0's "Configuring the Wrangler CLI locally" section — re-run `npx wrangler whoami` to confirm before troubleshooting further.

**Done when**: `backend/` exists with a real Hono app; `wrangler deploy` succeeds and returns a working `*.workers.dev` URL responding on `/health`; `.dev.vars` is gitignored. **Status: done, 2026-07-10.**

---

## Phase 2 — Data Layer: D1 + Drizzle *(done)*

**Goal**: D1 databases (prod + preview) exist, schema-managed via Drizzle, with a proven migration flow.

- [x] `wrangler d1 create slipstream-db` (id `289a720e-bce4-4e0a-9895-1d2c1e7e5e5e`) and `wrangler d1 create slipstream-db-preview` (id `6de970c9-9493-44e1-bae6-a56ea9ccbce1`); both bound as `DB` in `backend/wrangler.jsonc` (top-level + `env.preview`).
- [x] Added `drizzle-orm` + `drizzle-kit`; `backend/drizzle.config.ts` with `dialect: 'sqlite'`, `schema: './src/db/schema.ts'`, `out: './migrations'`. No `driver`/`dbCredentials` needed, as anticipated — only `drizzle-kit generate` was used, no `push`/`studio`.
- [x] Defined `backend/src/db/schema.ts` with **only the app tables**: `rides`, `ride_participants`, `motorcycle_profiles`, `organizer_messages`. Auth tables intentionally not hand-written — Phase 3's `@better-auth/cli generate` step adds `users`/`sessions`/`accounts` to this same file later. `organizerId`/`userId`/`senderId` columns are plain `text`, no FK constraint yet (the referenced `users` table doesn't exist until Phase 3); `motorcycle_profile_id` → `motorcycle_profiles.id` and `ride_id` → `rides.id` FKs are real since those tables co-exist in this same Phase-2 schema. Indexed `rides.region`/`rides.start_at`/`rides.riding_style` per NFR-002, plus `organizer_messages.ride_id` and a unique `(ride_id, user_id)` index on `ride_participants` to prevent duplicate joins.
- [x] `wrangler d1 migrations create slipstream-db init_schema` → `backend/migrations/0001_init_schema.sql`, filled via `drizzle-kit generate` (see Edge Cases for the file-merge step this required).
- [x] Applied in order: local → preview-remote (`--remote --env preview`, see Edge Cases) → production-remote. All three confirmed clean via `wrangler d1 migrations list ... --remote` (`No migrations to apply!`).
- [x] Documented the apply order (and the drizzle-kit → wrangler migration-file merge step) in `backend/README.md`.

**Edge cases**
- `--remote` migration failures: check working directory first (`backend/` must be cwd, or use `--config backend/wrangler.jsonc`). Then verify `wrangler --version` matches the pinned devDependency version. Then `wrangler d1 migrations list <db> --remote` to inspect drift before retrying.
- **`slipstream-db-preview` needs `--env preview` on every remote command** (hit during this execution): `wrangler d1 migrations apply slipstream-db-preview --remote` alone fails with `Couldn't find a D1 DB with the name or binding 'slipstream-db-preview' in your wrangler.jsonc file` — because that database is only declared inside the `env.preview` block, not top-level. Correct form: `wrangler d1 migrations apply slipstream-db-preview --remote --env preview`.
- **`drizzle-kit generate` and `wrangler d1 migrations create` don't share a numbering scheme** (hit during this execution): `wrangler d1 migrations create <db> <name>` makes an empty `migrations/000N_<name>.sql` wrangler will track; `drizzle-kit generate` independently writes its own `migrations/0000_<random-name>.sql` plus a `migrations/meta/` journal, unaware of wrangler's file. The working pattern: run both, copy drizzle-kit's generated SQL body into wrangler's numbered file (keep wrangler's header comment line), then delete drizzle-kit's own file and the `meta/` folder — wrangler's `migrations/NNNN_*.sql` files stay the single source of truth; drizzle-kit is only ever used for schema→SQL generation, never for tracking/applying.
- D1 has **no interactive transactions** — any multi-statement atomic operation (e.g. join-ride touching both `rides` and `ride_participants`) must use D1's `batch()` API, not hand-rolled `BEGIN/COMMIT`.
- Migrations don't roll back automatically when a code deploy is rolled back — write additive-first, not destructive-first.
- Treat `slipstream-db-preview` as disposable; never treat production data as recoverable from a mistake.

**Done when**: Both D1 databases exist and are bound per environment; the same migration file applies cleanly local → preview-remote → prod-remote in that order. **Status: done, 2026-07-10.**

---

## Phase 3 — Auth (better-auth + D1 + Google OAuth) *(done)*

**Goal**: FR-001 (email+password + Google OAuth) works end-to-end via direct HTTP calls against the deployed preview Worker.

- [x] Add `better-auth` as a backend dependency (plain package + manual D1 wiring). Installed alongside `@better-auth/drizzle-adapter` and `@better-auth/expo`, all pinned to `1.6.23`.
- [x] Create `backend/src/lib/auth.ts` exporting the **runtime factory function** — `getAuth(env: CloudflareBindings)` — constructed fresh on every call. **Never** instantiate `betterAuth(...)` at module top scope.
- [x] Create a **separate, CLI-only config** — `backend/src/lib/auth.cli-config.ts` — that directly exports a plain `auth` instance built with the same `socialProviders`/plugin options as the runtime factory, but a placeholder `database` value (a `drizzleAdapter` over a stub `D1Database` object — never queried, since the CLI only introspects config shape).
- [x] `npx @better-auth/cli generate --config ./src/lib/auth.cli-config.ts --output ./src/db/auth-schema.ts --yes` — **deliberately targeted a separate temp file, not `schema.ts` directly** (confirmed via pre-implementation research that `generate` overwrites its `--output` file wholesale, dropping unrelated existing tables/columns). Generated tables hand-merged into `src/db/schema.ts`, temp file deleted. Migration `0002_better_auth_tables.sql` hand-authored from the merge (drizzle-kit has no journal continuity after Phase 2 discarded `migrations/meta`, so a fresh `drizzle-kit generate` would have re-emitted `CREATE TABLE` for all 8 tables, not just the 4 new ones — extracted only the new tables' SQL, in FK dependency order: `users` → `sessions`/`accounts` → `verifications`). Applied local → preview-remote → prod-remote, all confirmed clean.
- [x] Mount the handler in `backend/src/index.ts` via the runtime `getAuth(c.env)` factory, constructed per-request, same rule as above. Route: `app.on(['GET','POST'], '/api/auth/*', (c) => getAuth(c.env).handler(c.req.raw))`.
- [x] Verify the current better-auth Expo integration surface at build time — done via a dedicated research pass before writing code (see Edge Cases below for the version/config findings).
- [x] Add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to `backend/.dev.vars` (template updated at `.dev.vars.example` to include `BETTER_AUTH_URL`). `BETTER_AUTH_URL` also added to `wrangler.jsonc` as a plain per-environment `vars` entry (not a secret).
- [x] (MANUAL — human) Set production secrets interactively via `wrangler secret put` — done for both top-level/production and `--env preview`, with a distinct `BETTER_AUTH_SECRET` per environment.
- [x] Smoke test against the deployed preview Worker — and, since production was also redeployed with the real auth wiring this session, against production too. Both confirmed: email+password round-trip persists to the correct D1; Google `sign-in/social` returns a correctly-constructed redirect URL matching each environment's registered Google Console callback.

**Edge cases**
- **CLI generator expects a plain `auth` export, not a factory**: confirmed via research (GitHub issue #4110) — `@better-auth/cli generate` can't call a `getAuth(env)` factory since there's no Workers `env` binding in the Node-side CLI. Hence the separate `auth.cli-config.ts`. Keep its `socialProviders`/plugin options in sync with the runtime factory by hand whenever one changes.
- **`@better-auth/cli generate --output` is destructive, not additive** (research finding, GitHub issue #5874): pointing it at an existing schema file with unrelated tables silently drops them. Always generate into a throwaway file and hand-merge; never point `--output` at `schema.ts` directly.
- **`@better-auth/cli`'s npm `latest` tag (`1.4.21`) lags core `better-auth` (`1.6.23`)** — confirmed via research and again when running it (`npx @better-auth/cli generate` installed `1.4.21`). Output matched expectations this time, but re-verify generated schema shape against the actual installed core version after any future upgrade.
- **Cloudflare Workers module-init crash risk, checked and ruled out**: pre-implementation research surfaced an upstream, unresolved `createRequire(import.meta.url)` crash reported against this exact Hono-on-Workers + better-auth shape (GitHub issues #6665/#6690). Ran a minimal spike (`import { betterAuth } from 'better-auth'` + a bare `betterAuth({...})` call in a throwaway route) before building the full integration — deployed and executed cleanly on `wrangler 4.110.0` / `workerd@1.20260708.1`. Not hit here; if a future dependency bump reintroduces it, the documented workaround is a `node:module` alias stub in `wrangler.jsonc`.
- **`wrangler types` incorporates `.dev.vars` into `CloudflareBindings`**: after adding entries to `backend/.dev.vars`, re-running `npm run cf-typegen` picked up `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`/`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` as typed string bindings automatically — no need for a hand-written `Env` extension type. Re-run `cf-typegen` after any `.dev.vars` or `wrangler.jsonc` change.
- **Existing app-table columns left without a live FK to `users.id`**: `motorcycle_profiles.user_id`, `rides.organizer_id`, `ride_participants.user_id`, `organizer_messages.sender_id` stay plain `text`. SQLite/D1 can't add a FK constraint to an already-migrated column without a full table rebuild; deferred rather than bundled into this migration.
- **Preview Google OAuth needed its own registered redirect URI**: the Phase 0 Google OAuth client only had the production callback registered. Preview's `sign-in/social` call correctly derives `https://slipstream-api-preview.jd7552820.workers.dev/api/auth/callback/google` from its own `BETTER_AUTH_URL`, but Google would reject it until that exact URI was added to the same Web application client's authorized redirect URIs (both env share one client — no need for a second).
- **Apple Sign-In tracked risk**: shipping Google OAuth to iOS without Apple Sign-In risks App Store rejection under Guideline 4.8 — explicitly deferred past this plan's execution scope; `socialProviders` structured so adding `apple` later is a config addition.
- **`trustedOrigins`**: set to `['slipstream://', 'exp://']` — the latter is Expo-Go-dev-only and should be tightened to `slipstream://` alone once Expo Go is no longer part of the workflow.
- **Expo Go vs. standalone build redirect mismatch**: not yet applicable (Phase 6 wires the actual Expo client) — check the registered Google Console redirect URI against the actual build's scheme if OAuth works in Expo Go but breaks in a dev/production build.

**Done when**: A user can register with email+password and sign in with Google against the deployed preview Worker via direct HTTP calls; production secrets set via `wrangler secret put`, never committed; code review confirms no module-scope `betterAuth()` instantiation. **Status: done, 2026-07-13** — verified on both preview and production; full Google consent click-through (vs. just redirect-URL construction) deferred to Phase 8's real-device verification pass.

---

## Phase 4 — Rides & Participants API *(not started)*

**Goal**: FR-002/003/013, FR-004/005, FR-006, FR-007, FR-008, FR-009, FR-010 servable via Hono routes, satisfying NFR-002 (<2s p95 list load).

- [ ] `backend/src/routes/profile.ts` — CRUD for user + motorcycle profile.
- [ ] `backend/src/routes/rides.ts` — create / list+filter / detail.
- [ ] `backend/src/routes/participants.ts` — join (no approval step) / organizer-only remove.
- [ ] `backend/src/routes/messages.ts` — message to organizer (flat table, distinct from Phase 5's realtime chat).
- [ ] Middleware: logged-out blocked; flat authenticated-user role; organizer role derived contextually.
- [ ] Input validation (`zod` + Hono validator middleware).
- [ ] Deploy to preview; smoke test every endpoint.

**Edge cases**
- Join-ride atomicity via `batch()` (no interactive transactions in D1).
- NFR-002: index the actual filter columns; measure list-endpoint latency under a seeded dataset before calling this done.
- Privacy guardrail: keep public start address and any future precise-location field as clearly distinct fields/serializers.
- Cross-user data bleed in smoke tests → revisit the Phase 3 factory-function checklist first.

**Done when**: Both PRD success-criteria paths work end-to-end via direct API calls against the deployed preview Worker; list latency stays comfortably under 2s.

---

## Deferred phases (documented, not started)

### Phase 5 — Realtime Chat via Durable Objects (FR-012, nice-to-have)
`ChatRoom` DO class, one instance per ride, WebSocket Hibernation API. **Hard rule**: the first migration entry referencing this class must set `new_sqlite_classes: ["ChatRoom"]` — a live class cannot be converted to SQLite storage after the fact; rehearse in a scratch/dev deploy first. Verify message persistence across hibernation in preview before replicating to production.

### Phase 6 — Expo Client Wiring
Convert `app.json` → `app.config.ts`, add `extra.apiUrl` sourced from `EXPO_PUBLIC_API_URL`, `.env.example`, API client reading `Constants.expoConfig.extra`, better-auth Expo client plugin with SecureStore, `eas.json` with dev/preview/production profiles. Key edge case: `EXPO_PUBLIC_*` values are inlined at **build** time — a native EAS build must be rebuilt, not just restarted, to pick up a changed value.

### Phase 7 — CI/CD via GitHub Actions
`.github/workflows/backend-preview.yml` (auto on push/PR touching `backend/**`, non-destructive `wrangler versions upload --env preview`) and `.github/workflows/backend-deploy.yml` (`workflow_dispatch` only, gated by a GitHub `production` Environment with required reviewers, promotes an already-verified preview version). Implements the `ci_provider: github-actions` / `ci_default_flow: manual-promotion` intent recorded in `tech-stack.md`.

### Phase 8 — Verification / Smoke-Test Phase
Both PRD paths run end-to-end through the real Expo app on physical iOS and Android hardware — simulator-only testing is insufficient for token-refresh/background-state auth bugs. Confirm NFR-002 empirically, confirm the privacy guardrail, dry-run the production promotion gate at least once.

### Phase 9 — Deploy-Plan Audit Artifact Upkeep
This file. Update incrementally per phase completion as execution resumes — not written once at the end.

---

## Verification (for Phases 0–4, once resumed)

- `wrangler deploy` from `backend/` returns a live `*.workers.dev` URL responding on `/health`.
- `wrangler d1 migrations list slipstream-db-preview --remote` and `... slipstream-db --remote` both show the same migration applied cleanly.
- Direct HTTP smoke test against the deployed preview Worker covering both PRD success-criteria paths.
- Code review confirms zero module-scope `betterAuth()` instantiation in `backend/src`.
- `wrangler tail` during the smoke test shows no unexpected exceptions.

## Critical files
- `context/foundation/infrastructure.md` — platform decision this plan implements
- `context/foundation/prd.md` — functional requirements this plan satisfies
- `context/foundation/tech-stack.md` — CI provider/flow intent for the deferred Phase 7
- `app.json`, `package.json`, `.gitignore`, `.gitattributes` — renamed/extended in Phase 0–1 (done)
- `backend/wrangler.jsonc`, `backend/src/index.ts`, `backend/.dev.vars.example` — scaffolded in Phase 1, extended in Phase 3 with the auth route mount and `BETTER_AUTH_URL` vars (done)
- `backend/drizzle.config.ts`, `backend/src/db/schema.ts` — created in Phase 2, extended in Phase 3 with `users`/`sessions`/`accounts`/`verifications` (done)
- `backend/src/lib/auth.ts` (runtime factory), `backend/src/lib/auth.cli-config.ts` (CLI-only, for schema generation) — created in Phase 3 (done)

## Next step

Phases 0 (Web OAuth client done; iOS/Android clients still pending, not blocking), 1, 2, and 3 are done. **Stopped before starting Phase 4** — next session should resume with **Phase 4 — Rides & Participants API** (`backend/src/routes/{profile,rides,participants,messages}.ts`, zod validation, join-ride atomicity via D1 `batch()`).
