# Expo Router Navigation Shell with Auth Session Gate — Plan Brief

> Full plan: `context/changes/frontend-auth-shell/plan.md`

## What & Why

Replace the default Expo Router starter navigation with an auth-gated shell: unauthenticated users see a sign-in screen, authenticated users see the app. This is roadmap item F-01 — a foundation piece with no prerequisites that unlocks S-01 and every later slice, since no real screen can exist without a session gate and a shared navigation structure in place first.

## Starting Point

The app currently ships the vanilla Expo Router starter (`app/_layout.tsx` with a static `(tabs)`/`modal` `Stack`, no session check). `app/(tabs)/index.tsx` has already been repurposed as a temporary `DevAuthTestScreen` that proves the better-auth client (`lib/auth-client.ts`) works end-to-end — sign-in, sign-out, session read, authenticated fetch — but it's explicitly marked for removal. `explore.tsx` and `modal.tsx` are still untouched starter demo content.

## Desired End State

A signed-out user cold-starting the app lands on a sign-in screen. Signing in moves them to a Home screen showing their email. Relaunching while already signed in skips the sign-in screen entirely (session persisted in SecureStore). Signing out returns to the sign-in screen. None of the old starter screens exist anymore.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| `(auth)` group content | Sign-in only, no sign-up | Registration/profile completion is S-01's job — F-01 only needs enough to prove the gate | Plan |
| Gating mechanism | Conditional `Stack.Screen` groups in root layout | Matches Expo Router's documented auth pattern and better-auth's `useSession()` hook shape directly | Plan |
| Loading UX during session check | In-app loading view (not native splash) | Simpler to implement than coordinating `expo-splash-screen` hide timing | Plan |
| `unstable_settings.anchor` | Removed entirely | A static anchor can't be correct once the initial route depends on runtime session state | Plan |
| Starter cleanup scope | Delete `(tabs)`, `modal.tsx`, and their exclusively-used demo components | F-01's roadmap outcome explicitly says it replaces the default skeleton | Plan |
| `(app)` group content | Single Home screen, no tab bar | No second real destination exists yet (rides list/create-ride land in S-02/S-03) | Plan |
| Mid-session invalidation (token expiry) | Rely on `useSession()` reactivity only, no 401 interceptor | Keeps this foundational change tightly scoped to cold-start gating | Plan |
| Verification approach | Structured manual device pass, no new test framework | No test framework exists in the repo yet; this is the fastest path to real confidence | Plan |
| Theming primitives (`ThemedText`/`ThemedView`/`theme.ts`) | Kept, not deleted | Reusable infra the new screens (and future slices) need, unlike starter demo components | Plan |

## Scope

**In scope:**
- New `(auth)` route group with a sign-in screen
- New `(app)` route group with a minimal Home screen (email + sign-out)
- Root layout rewired to gate between them based on session state
- Deletion of the old `(tabs)` group, `modal.tsx`, and their exclusively-used dead-code components

**Out of scope:**
- Sign-up/registration and profile completion UI (S-01)
- Ride list, create-ride, or any tabbed content (S-02/S-03+)
- 401 interceptor / mid-session invalidation handling
- Automated tests
- Any backend or better-auth server changes

## Architecture / Approach

Two self-contained route groups (`(auth)`, `(app)`), each with its own `_layout.tsx` (a one-screen `Stack`). The root `_layout.tsx` calls `authClient.useSession()` and renders exactly one group's `Stack.Screen` at a time — a loading view while pending, `(auth)` when signed out, `(app)` when signed in. No new libraries; reuses the already-deployed and already-wired `lib/auth-client.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Auth-gated navigation shell | New `(auth)`/`(app)` groups + root layout gate + loading state | Getting the pending/auth/app render-order wrong could flash the wrong screen or throw a navigation error |
| 2. Starter cleanup | Removes `(tabs)`, `modal.tsx`, and dead demo components | Missing a lingering import would break the Metro bundle |

**Prerequisites:** None — this is a roadmap foundation item with no upstream dependencies.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- Assumes `authClient.useSession()`'s `isPending`/`data` shape remains stable (already proven in the current `DevAuthTestScreen`, so low risk).
- No automated regression protection for the gate logic going forward — a future change could silently break it without a failing test to catch it.

## Success Criteria (Summary)

- Signed-out cold start → sign-in screen; sign-in → Home screen; relaunch while signed in → Home screen directly; sign-out → sign-in screen.
- No old starter screens (`(tabs)`, `modal`) remain reachable, and the app still type-checks, lints, and bundles cleanly.
