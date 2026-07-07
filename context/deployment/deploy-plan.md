---
project: slipstream
plan_status: awaiting-execution
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

## Current status (as of 2026-07-07)

**Nothing has been executed. This is a plan-only artifact.** An earlier session in this thread briefly executed Phase 0/1 as a proof-of-concept (renamed `app.json`/`package.json`, scaffolded `backend/`), then reverted all of it back to the pre-existing repo state at the user's request — the repo currently contains no code changes from this plan, only this document and `context/foundation/infrastructure.md`. Nothing has touched a real Cloudflare account; no D1 database or Worker exists.

The lessons learned during that proof-of-concept are kept below (in each phase's Edge Cases) since they're still true and will apply the next time these steps actually run — treat them as pre-flight warnings, not a status report.

**Known repo-state quirk found during that session**: `npm audit` on the Expo app's dependency tree reported 20 vulnerabilities (1 low, 16 moderate, 2 high, 1 critical) — higher than the "4 moderate, 0 critical/high" recorded in `context/changes/bootstrap-verification/verification.md` at bootstrap time. Not investigated as part of this plan (out of scope for backend infra work), but worth a look before shipping.

---

## Decisions to confirm/apply while executing

- [ ] **Naming**: backend directory `backend/`, Worker name `slipstream-api` + `slipstream-api-preview` env, D1 databases `slipstream-db` (prod) / `slipstream-db-preview`, Durable Object class `ChatRoom` bound as `CHAT_ROOM` (reserved name for Phase 5).
- [ ] **Environments**: `wrangler.jsonc` top-level block = production; `env.preview` block = preview, each needs its own D1 binding (`DB`).
- [ ] **Placeholder rename**: `app.json`'s `name`/`slug`/`scheme` and `package.json`'s `name` still say `.bootstrap-scaffold`/`bootstrap-scaffold` — rename to `slipstream` in Phase 0, before Google OAuth redirect-URI registration (the URI includes the scheme).

---

## Phase 0 — Prerequisites & External Account Setup

**Goal**: Cloudflare account/token and Google OAuth app exist and are scoped correctly before backend code depends on them.

- [ ] (MANUAL — human) Create/confirm the Cloudflare account to use.
- [ ] (MANUAL — human) Create a scoped Cloudflare API token with two Account-level permissions: **"Workers Scripts: Edit"** and **"D1: Edit"**, this account only — no DNS/Zone permissions, no billing, no unrelated-project access. Correction from an earlier draft of this plan: Durable Objects has **no separate permission group** in Cloudflare's token UI — DO classes deploy as part of the Worker script, so "Workers Scripts: Edit" already covers them; don't go looking for a "Durable Objects" checkbox that doesn't exist. R2 ("Workers R2 Storage: Edit") is intentionally left off this token for now since no phase through Phase 4 provisions R2 — add it later, when a feature actually needs file storage, rather than granting unused scope now. No credit card is required for the Workers/D1 free tier. Store the token in a password manager, never paste it into chat.
- [ ] (MANUAL — human) Note the Cloudflare Account ID (dashboard sidebar).
- [ ] Rename placeholders: `app.json` → `expo.name`/`expo.slug`/`expo.scheme` = `"slipstream"`; `package.json` → `name` = `"slipstream"`. A prior pass confirmed the only other repo references to the old placeholder name are in the 10x-bootstrapper skill's own generic docs and the historical `bootstrap-verification/verification.md` audit record — neither should be touched.
- [ ] (MANUAL — human) Register a Google Cloud OAuth app: consent screen + OAuth client ID(s) (iOS + Android + Web client). Redirect URI uses the `slipstream://` scheme — confirm exact URI format against current `expo-auth-session`/better-auth Expo plugin docs at build time.
- [ ] Wire secrets once they exist: GitHub Actions repo secrets for CI (Phase 7), `backend/.dev.vars` for local dev, `wrangler secret put` for production (Phase 3).

**Edge cases**
- If a token is pasted into chat by accident: treat as compromised, rotate immediately (human-only), never store the leaked value anywhere in the repo.
- If Google's OAuth app-verification review is slow: use "Testing" publish status with explicit test users so later phases aren't blocked.

**Done when**: Cloudflare token + account ID exist outside the repo; Google OAuth client ID(s) exist matching the `slipstream://` scheme; `app.json`/`package.json` renamed.

---

## Phase 1 — Backend Project Scaffold

**Goal**: A deployable, empty Hono-on-Workers project at `backend/`.

- [ ] Scaffold via `npx create-hono@latest backend --template cloudflare-workers --pm npm --install` — **do not use `create-cloudflare --framework=hono`** (see Edge Cases: confirmed broken in a prior attempt).
- [ ] Rename the Worker's `name` in `backend/wrangler.jsonc` to `slipstream-api`.
- [ ] Confirm `wrangler` is pinned as a local devDependency in `backend/package.json` (not a global install) — keeps local/CI Wrangler versions resolvable to the same lockfile version.
- [ ] Add an `env.preview` block to `backend/wrangler.jsonc` (Worker name `slipstream-api-preview`); D1 binding for it added in Phase 2.
- [ ] Enable `"compatibility_flags": ["nodejs_compat"]` in `wrangler.jsonc` — needed by better-auth in Phase 3, cheap to turn on now.
- [ ] Create `backend/.dev.vars.example` (committed, placeholder values only: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- [ ] Confirm `backend/.gitignore` (from the `create-hono` template) covers `.dev.vars`/`.env`.
- [ ] Add a root-level `.gitattributes` enforcing LF for `.dev.vars*` — Wrangler's `.dev.vars` parser is picky about CRLF on Windows checkouts.
- [ ] Add a basic `/health` route to `src/index.ts`.
- [ ] First deploy: `wrangler deploy` from `backend/`; confirm the `*.workers.dev` URL responds on `/health`.

**Edge cases**
- **`create-cloudflare --framework=hono` doesn't work reliably** — confirmed via two independent attempts (once via `npm create cloudflare@latest`, once via direct `npx create-cloudflare@latest`), both silently fell back to the default Hello-World-with-assets template regardless of the flag, with no `hono` dependency at all. This matches a known class of issue reported against `cloudflare/workers-sdk` (C3 dispatching to Hono's own `create-hono` tool doesn't reliably pass through the desired template argument). Use `npx create-hono@latest backend --template cloudflare-workers --pm npm --install` directly instead — confirmed to produce a real Hono app with `hono` as a runtime dependency.
- Windows: Wrangler officially supports Windows 11 (this machine). Expect a trailing `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` crash message from `npm create`/`npx create-hono` on process exit — this is a known Windows-specific Node/npm child-process cleanup bug, unrelated to whether the scaffold itself succeeded. Verify the actual output files rather than trusting the exit code/absence of a crash message.
- `rm -rf` is blocked by this environment's permission policy even after conversational approval. If a scaffold attempt needs discarding, use `mv` to relocate it out of the repo rather than trying to delete it in place.
- If `wrangler deploy` fails on auth locally: run `wrangler login` **directly in your own terminal**, not via an automated agent tool call — an automated `wrangler login` attempt timed out waiting for the browser OAuth callback in a prior session, since completing the browser consent step requires real-time human interaction. This is separate from the CI token (`CLOUDFLARE_API_TOKEN` env var); don't conflate the two.

**Done when**: `backend/` exists with a real Hono app; `wrangler deploy` succeeds and returns a working `*.workers.dev` URL responding on `/health`; `.dev.vars` is gitignored.

---

## Phase 2 — Data Layer: D1 + Drizzle *(not started)*

**Goal**: D1 databases (prod + preview) exist, schema-managed via Drizzle, with a proven migration flow.

- [ ] `wrangler d1 create slipstream-db` and `wrangler d1 create slipstream-db-preview`; bind both as `DB` in `backend/wrangler.jsonc` (top-level + `env.preview`).
- [ ] Add `drizzle-orm` + `drizzle-kit`; add `backend/drizzle.config.ts` with just `dialect: 'sqlite'`, `schema: './src/db/schema.ts'`, `out: './migrations'`. **No `driver`/`dbCredentials` needed** — those (`d1-http` driver, `CLOUDFLARE_ACCOUNT_ID`/`DATABASE_ID`/a separate D1 API token) are only required for `drizzle-kit push`/`studio`; this plan only uses `drizzle-kit generate` (pure schema→SQL, no live DB connection) and then applies the SQL via `wrangler d1 migrations apply`, so skip that complexity entirely.
- [ ] Define `backend/src/db/schema.ts` with **only the app tables**: `rides`, `ride_participants`, `motorcycle_profiles`, `organizer_messages`. Do not hand-write auth tables here — Phase 3's `@better-auth/cli generate` step adds `users`/`sessions`/`accounts` to this same file later; hand-writing placeholders first just creates something to reconcile.
- [ ] `wrangler d1 migrations create slipstream-db init_schema`; fill the generated SQL via `drizzle-kit generate` or by hand.
- [ ] Apply order, every time: local (`wrangler d1 migrations apply slipstream-db`) → preview-remote (`... slipstream-db-preview --remote`) → production-remote (`... slipstream-db --remote`).
- [ ] Document this apply order in `backend/README.md`.

**Edge cases**
- `--remote` migration failures: check working directory first (`backend/` must be cwd, or use `--config backend/wrangler.jsonc`). Then verify `wrangler --version` matches the pinned devDependency version. Then `wrangler d1 migrations list <db> --remote` to inspect drift before retrying.
- D1 has **no interactive transactions** — any multi-statement atomic operation (e.g. join-ride touching both `rides` and `ride_participants`) must use D1's `batch()` API, not hand-rolled `BEGIN/COMMIT`.
- Migrations don't roll back automatically when a code deploy is rolled back — write additive-first, not destructive-first.
- Treat `slipstream-db-preview` as disposable; never treat production data as recoverable from a mistake.

**Done when**: Both D1 databases exist and are bound per environment; the same migration file applies cleanly local → preview-remote → prod-remote in that order.

---

## Phase 3 — Auth (better-auth + D1 + Google OAuth) *(not started)*

**Goal**: FR-001 (email+password + Google OAuth) works end-to-end via direct HTTP calls against the deployed preview Worker.

- [ ] Add `better-auth` as a backend dependency (plain package + manual D1 wiring).
- [ ] Create `backend/src/lib/auth.ts` exporting the **runtime factory function** — `getAuth(env: Env)` — constructed fresh on every call. **Never** instantiate `betterAuth(...)` at module top scope.
- [ ] Create a **separate, CLI-only config** — `backend/src/lib/auth.cli-config.ts` — that directly exports a plain `auth` instance (default export or named `auth`) built with the same `socialProviders`/plugin options as the runtime factory, but a placeholder `database` value (the CLI generate step only introspects config shape to produce schema, it doesn't execute against a live D1 binding — a real `env.DB` isn't available in this Node-side codegen context anyway). This exists solely so `@better-auth/cli generate` has something to import; it is never used by the deployed Worker.
- [ ] `npx @better-auth/cli generate --config ./src/lib/auth.cli-config.ts --output ./src/db/schema.ts --yes` to add better-auth's `users`/`sessions`/`accounts` tables into the existing app schema file; apply via the Phase 2 migration flow.
- [ ] Mount the handler in `backend/src/index.ts` via the runtime `getAuth(c.env)` factory, constructed per-request, same rule as above.
- [ ] Verify the current better-auth Expo integration surface (server + client plugin, SecureStore-backed token storage, trusted-origins allowlist including `slipstream://`) at build time.
- [ ] Add `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to `backend/.dev.vars` (template exists at `.dev.vars.example`).
- [ ] (MANUAL — human) Set production secrets interactively via `wrangler secret put`.
- [ ] Smoke test against the deployed preview Worker.

**Edge cases**
- **CLI generator expects a plain `auth` export, not a factory**: `@better-auth/cli generate` reads an existing config file and expects a directly-instantiated `auth` instance (or default export) to introspect — it can't call a `getAuth(env)` factory since there's no Workers `env` binding available in the Node-side CLI. Hence the separate `auth.cli-config.ts` above — keep its `socialProviders`/plugin options in sync with the runtime factory by hand whenever one changes, since there's no single source of truth here without extra tooling. If this drift becomes painful, revisit (e.g. extract the shared config object both files import).
- **Silent singleton bug**: module-scope `betterAuth(...)` **in the runtime path** (`backend/src/lib/auth.ts`) can appear to work locally and break unpredictably in production (per-invocation D1 binding differences). Mitigate via code-review checklist, not local testing. (The CLI-only config file above is the one intentional exception to "never instantiate at module scope" — it never runs in the Worker.)
- **Apple Sign-In tracked risk**: shipping Google OAuth to iOS without Apple Sign-In risks App Store rejection under Guideline 4.8 — explicitly deferred past this plan's execution scope; structure `socialProviders` so adding `apple` later is a config addition.
- **CORS/trusted origins**: `slipstream://` must be in better-auth's trusted-origins allowlist.
- **Expo Go vs. standalone build redirect mismatch**: check the registered Google Console redirect URI against the actual build's scheme if OAuth works in Expo Go but breaks in a dev/production build.

**Done when**: A user can register with email+password and sign in with Google against the deployed preview Worker via direct HTTP calls; production secrets set via `wrangler secret put`, never committed; code review confirms no module-scope `betterAuth()` instantiation.

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
- `app.json`, `package.json`, `.gitignore`, `.gitattributes` — to be renamed/extended in Phase 0–1 (not yet done)
- `backend/wrangler.jsonc`, `backend/src/index.ts`, `backend/.dev.vars.example` — to be scaffolded in Phase 1 (not yet done)
- `backend/drizzle.config.ts`, `backend/src/db/schema.ts` — to be created in Phase 2 (not yet done)
- `backend/src/lib/auth.ts` (runtime factory), `backend/src/lib/auth.cli-config.ts` (CLI-only, for schema generation) — to be created in Phase 3 (not yet done)

## Next step

Nothing is executed yet. When ready to start: complete Phase 0's manual steps (Cloudflare account + scoped API token + Google OAuth app), then have Wrangler authenticated by running `wrangler login` **directly in your own terminal** (not via an automated agent tool call — the browser OAuth step needs real-time human interaction), then resume execution from Phase 0 onward.
