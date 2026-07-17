# Expo Router Navigation Shell with Auth Session Gate Implementation Plan

## Overview

Replace the default Expo Router starter navigation (`(tabs)` group + `modal`) with an auth-gated shell: an `(auth)` route group for unauthenticated users and an `(app)` route group for authenticated users, switched by the root layout based on the already-deployed better-auth session (`authClient.useSession()`, backed by SecureStore via `@better-auth/expo`). This is roadmap item F-01 — a foundation piece with no prerequisites that unlocks S-01 and every later slice.

## Current State Analysis

- `app/_layout.tsx` is the vanilla Expo Router starter: a single `<Stack>` with `(tabs)` and `modal` screens, no session check, no redirect logic, and a hardcoded `unstable_settings.anchor: '(tabs)'`.
- `app/(tabs)/` is the only route group that exists today — no `(auth)`/`(app)` split exists yet; this is greenfield routing work.
- `app/(tabs)/index.tsx` is **not** the original starter screen — it's a temporary `DevAuthTestScreen` (explicitly commented "remove once the actual sign-in/rides screens are built") that already proves `authClient.useSession()`, `authClient.signIn.email()`, `authClient.signUp.email()`, `authClient.signOut()`, and `authFetch()` work end-to-end against the deployed better-auth backend.
- `app/(tabs)/explore.tsx` and `app/modal.tsx` are untouched default Expo starter content (Collapsible sections, parallax header, starter modal) with no product value.
- `lib/auth-client.ts` and `lib/api-client.ts` are fully wired and require no changes: `authClient` (better-auth React client + `@better-auth/expo` plugin, SecureStore-backed) exposes `useSession()` (returns `{ data, isPending }`), `signIn.email()`, `signOut()`.
- No test framework is configured in `package.json` (only `lint`: `expo lint`); `tsconfig.json` exists so `npx tsc --noEmit` is available for type checking even without a dedicated script.

### Key Discoveries:

- `app/_layout.tsx:8-10` — `unstable_settings.anchor: '(tabs)'` is a static setting that can't be correct for both auth states; it must be removed since the entry route now depends on runtime session state.
- `app/(tabs)/index.tsx:1-103` — proves the exact `authClient` calls (`useSession`, `signIn.email`, `signOut`) this plan's new screens need; safe to model the new sign-in/home screens on this proven usage.
- `components/themed-text.tsx`, `components/themed-view.tsx`, `hooks/use-theme-color.ts`, `constants/theme.ts` (Colors/Fonts) are reusable theming primitives, not starter demo content — kept for the new screens and future slices, unlike the tab-bar/demo-specific pieces below.
- `components/haptic-tab.tsx`, `components/ui/icon-symbol.tsx` (+ `.ios.tsx`), `components/parallax-scroll-view.tsx`, `components/external-link.tsx`, `components/ui/collapsible.tsx`, `components/hello-wave.tsx` are used exclusively by the files being deleted in Phase 2 (confirmed via repo-wide import search) — dead code once cleanup lands.
- `hooks/use-color-scheme.ts` / `.web.ts` is used by `app/_layout.tsx` directly (kept regardless of cleanup) and must not be deleted.

## Desired End State

An unauthenticated cold start lands on `(auth)/sign-in`; signing in flips `authClient.useSession()`, and the root layout swaps to the `(app)` group automatically. A signed-in user who force-quits and relaunches lands directly in `(app)` (session persisted via SecureStore) without seeing the sign-in screen. Signing out returns to `(auth)/sign-in`. The default Expo starter skeleton (`(tabs)`, `explore.tsx`, `modal.tsx`, and their exclusively-used demo components) no longer exists in the codebase.

Verification: manual device/simulator pass described in Phase 1's Manual Verification, plus `npx tsc --noEmit` and `npm run lint` passing cleanly across both phases.

## What We're NOT Doing

- Not building sign-up/registration or profile-completion UI — that's S-01 (rider-onboarding-profile) scope. The `(auth)` group ships sign-in only.
- Not building the ride list, create-ride, or any tabbed content — that's S-02/S-03+. The `(app)` group ships a single Home screen, no tab bar.
- Not adding a 401 interceptor to `authFetch` for mid-session invalidation — relying solely on `authClient.useSession()` reactivity to catch session changes, per explicit scope decision.
- Not adding automated tests (React Native Testing Library or similar) — no test framework exists in this repo yet, and structured manual verification was chosen as this change's verification approach.
- Not touching Google OAuth wiring, the backend, or better-auth server config — this is frontend routing/shell work only.
- Not restoring a tab bar in this change — real tabbed destinations arrive with S-02/S-03.

## Implementation Approach

Follow Expo Router's documented conditional-group authentication pattern: the root layout calls `authClient.useSession()` and renders exactly one of two `Stack.Screen` groups — `(auth)` or `(app)` — based on whether session data is present, with an in-app loading view shown while the session check is pending. Each group is self-contained: its own `_layout.tsx` (a `Stack` with one screen) and one screen component. Phase 1 builds this shell entirely alongside the existing starter files (so nothing is broken mid-phase); Phase 2 removes the now-superseded starter files and their exclusively-used dead-code dependencies.

## Critical Implementation Details

### Timing & lifecycle

While `authClient.useSession()` is pending, the root layout must render the loading view directly — not attempt to mount either the `(auth)` or `(app)` `Stack.Screen` — otherwise Expo Router may try to resolve an initial route before the session state (and therefore the correct group) is known. Switching which `Stack.Screen` is present between renders (pending → auth → app, or auth → app on sign-in) is expected and safe in Expo Router — it remounts the affected navigator — but it does discard any in-group navigation state. This is a non-issue here since the `(app)` group has exactly one screen.

## Phase 1: Auth-gated navigation shell

### Overview

Add the `(auth)` and `(app)` route groups with their minimal screens, then rewire the root layout to gate between them based on session state.

### Changes Required:

#### 1. Auth route group

**File**: `app/(auth)/_layout.tsx`

**Intent**: Stack navigator hosting the unauthenticated screen(s). Single screen for now (`sign-in`), header hidden to match the existing app-wide convention (`headerShown: false` used throughout the current `(tabs)` layout).

**Contract**: Default-exports a component rendering `<Stack>` with one `<Stack.Screen name="sign-in" options={{ headerShown: false }} />`.

**File**: `app/(auth)/sign-in.tsx`

**Intent**: Minimal email+password sign-in screen calling `authClient.signIn.email({ email, password })`, modeled on the proven usage in `app/(tabs)/index.tsx`. No sign-up form or link — registration is out of scope (S-01). On success, no manual navigation call is needed: `authClient.useSession()` reactivity in the root layout swaps the visible group automatically. On error, surface the returned `error.message` to the user.

**Contract**: Functional component with local `email`/`password` state (`useState`), a submit action calling `authClient.signIn.email`, and inline error display. Uses `ThemedText`/`ThemedView` for theming consistency.

#### 2. App route group

**File**: `app/(app)/_layout.tsx`

**Intent**: Stack navigator hosting the authenticated screen(s). Single screen for now (`index`), header hidden.

**Contract**: Default-exports a component rendering `<Stack>` with one `<Stack.Screen name="index" options={{ headerShown: false }} />`.

**File**: `app/(app)/index.tsx`

**Intent**: Minimal Home screen proving the gate works: displays the signed-in user's email (from `authClient.useSession()`) and a sign-out button (`authClient.signOut()`). Replaces `DevAuthTestScreen`'s proof-of-concept role with real (if minimal) app UI; no tabs, no rides content yet.

**Contract**: Functional component reading `session.user.email` from `authClient.useSession()` and rendering a sign-out button wired to `authClient.signOut()`. Uses `ThemedText`/`ThemedView`.

#### 3. Root layout gate

**File**: `app/_layout.tsx`

**Intent**: Replace the static `(tabs)`/`modal` `Stack` with a session-driven gate: while `authClient.useSession()` is pending, render an in-app loading view; once resolved, render a `<Stack>` containing only the `(auth)` `Stack.Screen` (no session) or only the `(app)` `Stack.Screen` (session present). Remove `unstable_settings.anchor` entirely (see Critical Implementation Details). Preserve the existing `ThemeProvider`, `StatusBar`, and the top-of-file `react-native-reanimated` side-effect import unchanged.

**Contract**: Default-exports `RootLayout`; no `unstable_settings` export; still wraps children in `ThemeProvider` fed by `useColorScheme()` and renders `StatusBar` as today. The `(tabs)`/`modal` `Stack.Screen` entries are replaced by `(auth)`/`(app)` entries (the physical `(tabs)`/`modal` files are removed in Phase 2, not this phase — their being temporarily unreferenced-but-present is a harmless transient state).

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

#### Manual Verification:

- Cold start while signed out lands on the `(auth)` sign-in screen (not the old starter screens).
- Signing in with a valid account redirects to the `(app)` Home screen showing the correct email, with no manual navigation glitch.
- Force-quitting and relaunching the app while signed in lands directly on the `(app)` Home screen (SecureStore-persisted session honored) without a flash of the sign-in screen.
- Tapping sign-out returns to the `(auth)` sign-in screen.
- No visible flash of the wrong group's content during the initial session-pending window.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Starter cleanup

### Overview

Remove the now-superseded default Expo starter files and the demo components/hooks/constants that are exclusively used by them, now that Phase 1's shell fully replaces their role.

### Changes Required:

#### 1. Remove superseded route files

**Files removed**: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx` (the temporary `DevAuthTestScreen`), `app/(tabs)/explore.tsx`, `app/modal.tsx` (and the now-empty `app/(tabs)/` directory).

**Intent**: These are fully superseded by Phase 1's `(auth)`/`(app)` groups — `(tabs)/index.tsx` was explicitly marked for removal once real screens existed, and `explore.tsx`/`modal.tsx` are untouched starter demo content with no product value per F-01's roadmap outcome ("replaces the default Expo starter skeleton").

**Contract**: No route named `(tabs)` or `modal` remains reachable in the app.

#### 2. Remove dead demo components/hooks/constants

**Files removed**: `components/haptic-tab.tsx`, `components/ui/icon-symbol.tsx`, `components/ui/icon-symbol.ios.tsx`, `components/parallax-scroll-view.tsx`, `components/external-link.tsx`, `components/ui/collapsible.tsx`, `components/hello-wave.tsx`.

**Intent**: Every one of these is imported exclusively (directly or via cascading imports) by the files removed in this phase's first change — confirmed via a repo-wide import search. `ThemedText`, `ThemedView`, `useThemeColor`, and `constants/theme.ts` (Colors/Fonts) are kept: they're used by the new Phase 1 screens and are reusable theming infra, not starter demo content.

**Contract**: No remaining import references any of the removed files anywhere in the repo.

### Success Criteria:

#### Automated Verification:

- Type checking passes: `npx tsc --noEmit`
- Linting passes: `npm run lint`

#### Manual Verification:

- App still cold-starts correctly into `(auth)` or `(app)` as appropriate (no regression from file removal).
- No dangling references to deleted files cause a Metro bundler error.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- None — no test framework is configured in this repo; not introduced by this change (see What We're NOT Doing).

### Integration Tests:

- None automated; covered by the manual device pass below.

### Manual Testing Steps:

1. Cold start the app while signed out → confirm the `(auth)` sign-in screen appears (not any old starter screen).
2. Sign in with a valid account → confirm redirect to `(app)` Home screen showing the correct email.
3. Force-quit and relaunch while signed in → confirm direct landing on `(app)` Home (no sign-in flash).
4. Tap sign-out → confirm return to `(auth)` sign-in screen.
5. After Phase 2, confirm no leftover route (`(tabs)`, `modal`) is reachable and the app still bundles/runs cleanly.

## Performance Considerations

None specific to this change — session check is a single local read from SecureStore-backed client state (`authClient.useSession()`), not a network round-trip on every render.

## Migration Notes

Not applicable — no data model or backend changes in this change.

## References

- Roadmap: `context/foundation/roadmap.md:55-66` (F-01 definition)
- Change identity: `context/changes/frontend-auth-shell/change.md`
- Proven auth-client usage pattern: `app/(tabs)/index.tsx` (removed in Phase 2, but its patterns seed Phase 1's new screens)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Auth-gated navigation shell

#### Automated

- [x] 1.1 Type checking passes: `npx tsc --noEmit` — 593b875
- [x] 1.2 Linting passes: `npm run lint` — 593b875

#### Manual

- [x] 1.3 Cold start while signed out lands on the `(auth)` sign-in screen — 593b875
- [x] 1.4 Signing in redirects to the `(app)` Home screen showing the correct email — 593b875
- [x] 1.5 Force-quit + relaunch while signed in lands directly on `(app)` Home — 593b875
- [x] 1.6 Sign-out returns to the `(auth)` sign-in screen — 593b875
- [x] 1.7 No visible flash of the wrong group's content during the session-pending window — 593b875

### Phase 2: Starter cleanup

#### Automated

- [x] 2.1 Type checking passes: `npx tsc --noEmit` — 9ec2ad6
- [x] 2.2 Linting passes: `npm run lint` — 9ec2ad6

#### Manual

- [x] 2.3 App still cold-starts correctly into `(auth)` or `(app)` as appropriate — 9ec2ad6
- [x] 2.4 No dangling references to deleted files cause a Metro bundler error — 9ec2ad6
