---
project: slipstream
researched_at: 2026-07-04
recommended_platform: Cloudflare (Workers + Durable Objects + D1 + R2)
runner_up: Railway
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Expo (React Native) client / Hono (recommended) on Workers for backend
  runtime: Cloudflare Workers (V8 isolates, nodejs_compat)
---

## Recommendation

**Deploy the backend on Cloudflare (Workers + Durable Objects + D1 + R2).**

The Expo/React Native mobile app's own distribution is already settled (EAS Build → App Store / Play Store) — this decision is about the backend that the app talks to for auth, ride listings, and the nice-to-have realtime group chat. Cloudflare scored Pass on four of five agent-friendly criteria (partial only on MCP maturity), came in cheapest at the project's expected 10k–100k monthly request volume (near-$0–5/mo, directly matching the "minimize cost" interview answer), and Durable Objects give WebSocket-backed chat without a second vendor. The persistent-connection hard filter (interview Q1 = yes, driven by the realtime chat feature) eliminated Netlify outright and downgraded Vercel, whose native WebSocket support is a two-week-old Public Beta with unresolved cost and reconnection caveats.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP/Integration | Cost @ 10k–100k req/mo |
|---|---|---|---|---|---|---|
| **Cloudflare** | Pass — `wrangler deploy`/`rollback`/`tail`, no interactive prompts | Pass — fully serverless isolate model | Pass — `llms.txt` per product plus "Markdown for Agents" content negotiation, best of the six researched | Pass — deterministic deploy, `wrangler deployments list` + `rollback <id>` | Partial — docs MCP server and Agents SDK exist; no dedicated account-ops MCP surfaced | ~$0–5/mo (free tier covers this volume; DO SQLite storage is metered since 2026-01-07 but cheap) |
| **Railway** | Pass — `railway up`/`logs`/`redeploy` | Pass — managed containers, Railpack build system (beta) with Nixpacks as stable fallback | Pass — docs source open on GitHub (`railwayapp/docs`) | Pass — deterministic `railway up`; rollback via redeploy, retention-window-limited | Partial — official MCP server exists but beta | ~$10–25/mo (no free tier since 2023; Hobby $5/mo + usage) |
| **Render** | Partial — deploy/logs solid, but **no CLI rollback command** (dashboard or REST API only) | Pass — managed web services, Postgres, KV, cron, Frankfurt region | Pass — `.md` content negotiation + `llms.txt` + experimental Docs MCP | Partial — deploy scriptable, but rollback API doesn't auto-disable autodeploy | Partial — official MCP server, 20+ tools, maturity unlabeled | ~$14/mo paid (or free tier, but free Postgres expires 30 days after creation) |
| Fly.io | Pass — `flyctl deploy`/`logs`/`status`; no dedicated rollback command (use `deploy --image <old>`) | Pass — managed Machines, but Dockerfile required | Partial — copy-as-markdown + `llms.txt`, but no official GitHub-hosted doc source | Pass — deterministic deploy, verifiable via status/logs | Partial — `fly mcp server` explicitly labeled experimental | ~$40+/mo (Managed Postgres alone starts at $38/mo — conflicts directly with cost priority) |
| Vercel | Pass — mature CLI (`deploy`, `rollback`, `logs`) | Pass — Functions + Fluid Compute | Pass — `.md` + `llms.txt` | Pass | Partial — read-only hosted MCP | Native WebSockets are **Public Beta as of 2026-06-22** — too immature to trust for the MVP's realtime feature; excluded from shortlist |
| Netlify | Pass (for stateless functions) | Pass | Pass — `.md` + `llms.txt`, official MCP server GA | Partial — no CLI rollback verb, UI/API only | Pass — official `netlify-mcp`, GA since June 2025 | N/A — **hard-filtered**: Functions are stateless/short-lived, confirmed no real WebSocket support (Netlify's own engineering blog and support forum) |

### Shortlisted Platforms

#### 1. Cloudflare (Workers + Durable Objects + D1 + R2) — Recommended

Best score across all five criteria and by far the cheapest option at MVP scale — directly matching the top-priority "minimize cost" answer from the interview. Durable Objects provide actor-per-chat-room state and WebSocket Hibernation for the realtime chat feature without needing a second, separately-billed realtime vendor (the workaround every other filtered-out platform would need). Docs are the most agent-readable of the six platforms researched, which matters for a solo developer building with an AI coding agent across an 8-week after-hours timeline.

#### 2. Railway

Best all-in-one developer experience: native WebSockets with no special configuration, one-click co-located Postgres/Redis/MySQL if the "don't know yet" answer on service co-location resolves toward wanting a unified vendor, and a single EU region (Amsterdam) that fits the single-region requirement. Costs more than Cloudflare (~$10–25/mo vs. ~$0–5/mo) because there's no meaningful free tier, but the actor-model learning curve that Cloudflare requires doesn't exist here — a traditional Node/Express mental model works unchanged.

#### 3. Render

Frankfurt region is a good fit for a Poland-based user base, and the paid tier is inexpensive (~$14/mo for a durable setup). Scored lower than Railway and Cloudflare because of two concrete agent-ops gaps: no CLI rollback command (dashboard or REST API only), and the free tier's Postgres database expires 30 days after creation — a trap for an 8-week MVP that might sit partially idle between after-hours work sessions.

## Anti-Bias Cross-Check: Cloudflare (Workers + Durable Objects)

### Devil's Advocate — Weaknesses

1. **Node compat gap** — `nodejs_compat` is an incrementally-expanding polyfill layer, not full Node parity. Common backend libraries (bcrypt native bindings, Prisma without an edge adapter, raw TCP-based DB drivers) may not work, forcing edge-compatible substitutes (e.g., Hono instead of Express, Drizzle+D1 instead of Prisma+Postgres).
2. **Durable Objects' actor-per-chat-room model is a real paradigm shift** from the typical Express/Socket.io mental model. Someone with "no strong platform familiarity" (per interview) will spend real ramp-up time learning DO lifecycle, the WebSocket Hibernation API, and the storage API — a cost not reflected in a CLI-quality score.
3. **Single-threaded DO per chat room caps throughput within one room** — fine for typical ride-group chat sizes, but there's no built-in horizontal fan-out if a room grows large (e.g., a big organized ride event).
4. **D1 read replication is still beta** — if the PRD's "large" expected user scale materializes, the natural scaling path for the database isn't GA yet.
5. **Billing changed recently** — Durable Object SQLite storage billing went live 2026-01-07, so tutorials, blog posts, and AI training data predating that are already stale about what's free vs. metered.

### Pre-Mortem — How This Could Fail

The team shipped the motorcyclist app's backend on Cloudflare Workers with Durable Objects for chat, expecting a near-free, "it just scales" MVP. Six months in, it's a mess. The solo developer, new to the actor model, spent two of eight sprint weeks fighting Durable Object lifecycle bugs — hibernated objects losing in-memory state they'd assumed persisted, WebSocket reconnects silently dropping messages. Auth used a JWT library that broke under `nodejs_compat`'s partial crypto polyfills, discovered only in a late-stage App Store review build. As user growth exceeded expectations (per the PRD's "large" scale target), D1 query latency crept up; the fix — read replicas — was still beta and flaky in the target region, so the team bolted on an external Postgres via Hyperdrive under deadline pressure, doubling infra surface right before launch. Nobody had budgeted migration time. The "cheapest platform" ended up costing more in developer-hours lost to unfamiliar primitives than a boring Node-on-a-VM platform would have.

### Unknown Unknowns

- **Local dev doesn't perfectly emulate production**: `wrangler dev` doesn't fully replicate Durable Object hibernation timing or D1 replication behavior — bugs that only appear in production are harder to reproduce locally than with a traditional Node server.
- **Cold-start-after-eviction on Durable Objects**: "zero cold start" marketing applies to stateless Workers, not a hibernated DO waking up — the first reconnect to a chat room nobody has messaged in hours has real, non-obvious latency.
- **Observability is less mature than typical Node APM tooling** — expect to lean on `wrangler tail` and manual logging more than a traditional stack-trace-across-services debugging flow.
- **"Serverless means no lock-in" is a myth here** — D1's SQL dialect and the Durable Object storage API mean migrating off Cloudflare later is a genuine rewrite, not a redeploy.
- **React Native token-refresh and background-app-state transitions** interacting with short JWT lifetimes and edge-distributed session validation can produce subtle auth bugs that don't show up in simulator testing — test on real devices before relying on this pattern.

## Operational Story

- **Preview deploys**: `wrangler deploy --env preview` (or a branch-based Worker via Wrangler environments) produces a distinct `*.workers.dev` URL per environment; no fork-PR restriction since deploys are triggered by the developer/CI, not GitHub's own preview infrastructure. No additional access protection is configured by default — add Cloudflare Access if the preview URL needs to stay private.
- **Secrets**: Managed via `wrangler secret put <NAME>` (stored encrypted in Cloudflare's control plane, not in the repo) for production; local development uses `.dev.vars` (gitignored). Only account members with Workers edit permission can read/rotate secrets from the dashboard or API token scoped to that permission.
- **Rollback**: `wrangler deployments list` to find a prior deployment ID, then `wrangler rollback <deployment-id>` reverts traffic — typically seconds. Caveat: D1 schema migrations do not automatically roll back with a code rollback; a migration that shipped alongside broken code needs a manual reverse migration.
- **Approval**: Routine deploys and rollbacks can run unattended via CLI/CI. Human-only actions: rotating the account-level API token, deleting a D1 database or R2 bucket, and any Workers paid-plan billing tier change.
- **Logs**: `wrangler tail` streams live production request/exception logs (structured JSON with `--format json`); `wrangler d1 execute --command "..."` for read-only D1 queries during debugging.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Solo developer loses significant MVP time learning the Durable Objects actor model with no prior Workers experience | Devil's advocate | M | H | Prototype the chat feature's DO first, in week 1–2, before building dependent features; budget explicit learning time rather than treating it as a known quantity |
| Common Node backend libraries (bcrypt, Prisma, raw DB drivers) don't work under `nodejs_compat` | Devil's advocate | M | M | Standardize on Workers-native choices early: Hono for routing, Drizzle ORM with the D1 adapter, `jose` for JWT (pure JS, no native bindings) |
| D1 read replication (needed if usage grows) is still beta and region-dependent | Devil's advocate / Research finding | L (at MVP scale) | M | Monitor D1 query latency; if replication is needed before it's GA, fall back to Cloudflare Hyperdrive + external Postgres rather than waiting on the beta |
| Hibernated Durable Object cold-start latency on the first message to an idle chat room | Unknown unknowns | M | L | Set user expectations (brief "connecting..." state in the chat UI) rather than assuming instant reconnect |
| Auth token refresh / background app-state transitions on React Native produce edge-session bugs not caught by simulator testing | Unknown unknowns | M | H | Explicit test pass on physical iOS and Android devices for login persistence and chat reconnect before EAS submission |
| D1 schema migration doesn't automatically roll back when a code deploy is rolled back | Pre-mortem | L | H | Write migrations to be backward-compatible for at least one deploy cycle (additive changes first, destructive changes in a following deploy) |
| Cloudflare's DO SQLite billing (live since 2026-01-07) makes cost assumptions from older tutorials/training data stale | Research finding | L | L | Verify current Durable Objects pricing on `developers.cloudflare.com/durable-objects/platform/pricing` before finalizing any cost estimate used in planning |

## Getting Started

1. Install Wrangler: `npm install -g wrangler` (or use `npx wrangler` per-command to avoid a global install).
2. Scaffold the backend Worker: `npm create cloudflare@latest -- slipstream-api --framework=hono` (Hono is recommended over raw Workers handlers or Express for router ergonomics under `nodejs_compat`).
3. Provision D1: `wrangler d1 create slipstream-db`, then bind it in `wrangler.jsonc` and run schema migrations with `wrangler d1 migrations apply slipstream-db`.
4. Add a Durable Object binding for chat rooms in `wrangler.jsonc`, prototype the actor (one DO instance per ride's chat) before building dependent UI.
5. Deploy: `wrangler deploy` — note the returned `*.workers.dev` URL and point the Expo app's API client at it (via an environment-specific `app.config.ts` value, not hardcoded).

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
