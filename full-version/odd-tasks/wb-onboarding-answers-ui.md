# Workflow Builder onboarding answers UI evidence

## Scope

Frontend-only S6 piece 2 onboarding answer screens.

## Evidence

- Verified frontend root: `C:/Repos/open-dental-automation-dashboard/open-dental-dashboard-frontend`
- Verified branch: `main`
- Hook: `.husky/pre-commit` → lint-staged + build passed
- Focused test after hook: `npm test -- src/views/onboarding/__tests__/OnboardingAnswers.spec.ts` → 12 passed
- Typecheck after hook: `npm run typecheck` → passed
- Full regression after hook: `npm test` → 43 files passed, 199 tests passed

## Notes

- Invite tokens remain fragment/page-memory inputs and are sent only in public JSON bodies.
- The answer flow fetches detected questions after redeem and submits one sealed body: `token` plus `answers.draft`, `answers.window`, and `answers.note_reading`.
- Detection unavailable keeps all questions answerable and shows the plain client notice required by the slice.
