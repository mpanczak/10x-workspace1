---
bootstrapped_at: 2026-05-19T21:44:53Z
starter_id: expo
starter_name: Expo (React Native)
project_name: slipstream
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: expo
package_manager: npm
project_name: slipstream
hints:
  language_family: js
  team_size: solo
  deployment_target: appstore-via-eas
  ci_provider: github-actions
  ci_default_flow: manual-promotion
  bootstrapper_confidence: verified
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: true
  has_ai: false
  has_background_jobs: false
```

### Why this stack

Solo developer building a cross-platform mobile community app for motorcyclists in 8 weeks of after-hours work. Expo (React Native) is the recommended default for `(mobile, js)` and clears all four agent-friendly gates: TypeScript out of the box, file-based conventions from the Expo managed workflow, strong React Native presence in AI training data, and well-maintained versioned docs. Auth (has_auth) and realtime chat (has_realtime) are in scope — both are well-served by the React Native ecosystem without requiring ejection to bare workflow. Deployment via EAS Build to App Store and Play Store keeps native build infrastructure managed; GitHub Actions with manual promotion gives a safe gate before store submissions. Bootstrapper confidence is verified — scaffolding will be smooth.

## Pre-scaffold verification

| Signal      | Value                                           | Severity | Notes                                       |
| ----------- | ----------------------------------------------- | -------- | ------------------------------------------- |
| npm package | create-expo-app v4.0.0 published 2026-05-15     | fresh    | resolved from cmd_template                  |
| GitHub repo | not run                                         | —        | docs_url (https://docs.expo.dev) is not a GitHub URL |

## Scaffold log

**Resolved invocation**: `npx create-expo-app .bootstrap-scaffold --yes --template default`
**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 19
**Conflicts (.scaffold siblings)**: `.claude.scaffold/` (directory), `CLAUDE.md.scaffold`
**.gitignore handling**: moved silently (none existed in cwd)
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 0 HIGH, 4 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/1/0 direct of total 0/0/4/0

#### CRITICAL findings

None.

#### HIGH findings

None.

#### MODERATE findings

1. **postcss** — XSS via unescaped `</style>` in CSS Stringify Output
   - Advisory: GHSA-qx2v-qp2m-jg93 (CWE-79, CVSS 6.1)
   - Affected range: `< 8.5.10`
   - Fix: upgrade `expo` to `55.0.25` (semver major — requires `npm audit fix --force`)
   - Propagation chain: postcss → @expo/metro-config → @expo/cli → expo (direct)

2. **@expo/metro-config** — via postcss above
   - Transitive; resolved by same expo upgrade

3. **@expo/cli** — via @expo/metro-config above
   - Transitive; resolved by same expo upgrade

4. **expo** — direct dependency, carries the chain above
   - Fix available: expo@55.0.25 (semver major)

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | verified             |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | appstore-via-eas     |
| ci_provider             | github-actions       |
| ci_default_flow         | manual-promotion     |
| has_auth                | true                 |
| has_payments            | false                |
| has_realtime            | true                 |
| has_ai                  | false                |
| has_background_jobs     | false                |

These hints were read from the hand-off and logged for audit-trail completeness. A future M1L4 skill will act on `deployment_target`, `ci_provider`, `ci_default_flow`, and the `has_*` feature flags to scaffold CI pipelines and agent context files.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- Review `.claude.scaffold/` and `CLAUDE.md.scaffold` — these are the Expo default template's agent files. Compare them with your existing `.claude/` and `CLAUDE.md` to decide whether to adopt any content from them.
- `git init` if you want your own repo history (the scaffold created a `.git/` with the Expo initial commit — inspect or replace it as needed).
- Address the 4 moderate audit findings per your project's risk tolerance. Root fix: `npm install expo@55.0.25` — check Expo's changelog for breaking changes before upgrading.
- Run `npm run android` or `npm run ios` (macOS only) to verify the scaffold starts correctly.
