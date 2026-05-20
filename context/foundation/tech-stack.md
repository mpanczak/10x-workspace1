---
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
---

## Why this stack

Solo developer building a cross-platform mobile community app for motorcyclists in 8 weeks of after-hours work. Expo (React Native) is the recommended default for `(mobile, js)` and clears all four agent-friendly gates: TypeScript out of the box, file-based conventions from the Expo managed workflow, strong React Native presence in AI training data, and well-maintained versioned docs. Auth (has_auth) and realtime chat (has_realtime) are in scope — both are well-served by the React Native ecosystem without requiring ejection to bare workflow. Deployment via EAS Build to App Store and Play Store keeps native build infrastructure managed; GitHub Actions with manual promotion gives a safe gate before store submissions. Bootstrapper confidence is verified — scaffolding will be smooth.
