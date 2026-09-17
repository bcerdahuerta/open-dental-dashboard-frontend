# WB Magic-Link Onboarding — Piece 1 S4 Frontend Evidence (Onboarding Composer + Invite Rescue + SOP View)

Status: GREEN, not committed / not deployed (frontend `main` auto-deploys to production through Vercel, so pushing is a
production action and is forbidden for this unit).

## Scope and preservation

- Frontend-only. 14 new files + 4 minimal touches, all inside `open-dental-dashboard-frontend/full-version/`.
- No backend path was read-modified; backend contracts were read read-only from
  `open-dental-dashboard-backend-worktrees/workflow-builder-main-integration/` (S1/S2/S3a/S3b route + policy modules)
  to pin exact DTO field names.
- No commit, push, MR, merge, deploy, migration, or live-system call.
- No dependency, env var, or secret added. `git status` also still shows the pre-existing `M ../.gitignore` and
  untracked `.pi-lens/`, untouched by this unit.

## Product decisions applied

1. Rescue route `/o/:id` under `BlankLayout`: `:id` is a non-secret locator; the token is read only from
   `window.location.hash` (`src/views/onboarding/InviteRescue.vue`). Never in path, query, `Authorization`, logs,
   `localStorage`, or `sessionStorage`.
2. SOP is a screen checklist with a browser-print button (`window.print()`); no PDF/DOCX pipeline.
3. Composer is a visible admin sidebar entry (`/admin/onboarding`, `requiredRole: 'admin'`). `/admin/workflow-builder`
   stays orphan and untouched.
4. Client vocabulary is centralized in `src/components/onboarding/clientLabels.ts` (closed: FBD/ELG, states,
   archetypes, note and capability labels). No other file invents client copy.

## Folded technical decisions applied

- Plain TS label module, no `vue-i18n` coupling.
- Token lifetime: page memory only (ephemeral pinia ref in `onboardingRescue`).
- `src/router/index.ts`: `publicPrefixes = ['/o/']` added next to the exact `publicPages` list; nothing else changed.
- Public calls (`redeem`, `submit`) use plain `fetch` with `credentials: 'omit'`, `Content-Type: application/json`,
  and the token in the JSON body only; no auth header, no fetch-wrapper.
- Ops copy link is derived from the mint response fragment and rebuilt as
  `${origin}${import.meta.env.BASE_URL}o/${client_id}#${token}` so the link survives a non-root build base.

## Surfaces

| File                                                        | New/touch |    Lines |
| ----------------------------------------------------------- | --------- | -------: |
| `src/types/onboarding.ts`                                   | new       |      139 |
| `src/api/onboarding.ts`                                     | new       |       78 |
| `src/stores/onboardingComposer.ts`                          | new       |      122 |
| `src/stores/onboardingRescue.ts`                            | new       |       70 |
| `src/components/onboarding/clientLabels.ts`                 | new       |       43 |
| `src/components/onboarding/ClientComposerPanel.vue`         | new       |      139 |
| `src/components/onboarding/RescueForm.vue`                  | new       |      129 |
| `src/components/onboarding/SopChecklist.vue`                | new       |       98 |
| `src/views/onboarding/OnboardingComposer.vue`               | new       |       91 |
| `src/views/onboarding/InviteRescue.vue`                     | new       |       61 |
| `src/views/onboarding/SopVersionView.vue`                   | new       |       61 |
| `src/views/onboarding/__tests__/OnboardingComposer.spec.ts` | new       |      212 |
| `src/views/onboarding/__tests__/InviteRescue.spec.ts`       | new       |      173 |
| `src/views/onboarding/__tests__/SopVersionView.spec.ts`     | new       |      100 |
| `src/router/PublicRoutes.ts`                                | touch     |       +8 |
| `src/router/MainRoutes.ts`                                  | touch     |      +13 |
| `src/router/index.ts`                                       | touch     |  +4 / -1 |
| `src/layouts/full/vertical-sidebar/sidebarItem.ts`          | touch     |  +3 / -1 |
| **total**                                                   |           | **1540** |

Cap was 1200 new lines → **EXCEEDED by 340**, reported without trimming (frozen 12-test bodies kept whole, no declared
surface dropped). Cause: the three spec files alone are 485 lines (the repo's own precedent lifecycle spec is 1196),
and the unit carries 11 implementation surfaces because the composer, the public rescue, and the SOP view each need a
view + component + store, plus one shared label module.

## Acceptance evidence (TDD)

- RED: with the new modules renamed away (in place, `*.red`), the same three spec files fail on import resolution:
  `Test Files 3 failed (3)`, `Tests no tests`. Spec sha256 (8) unchanged by the rename: `8199e0f2`, `95d63eac`,
  `a5f83950`.
- GREEN: `npm test -- src/views/onboarding` → `Test Files 3 passed (3)`, `Tests 12 passed (12)`, exit 0.
- Regression: `npm test` → `Test Files 41 passed (41)`, `Tests 180 passed (180)` (168 pre-existing + 12 new), exit 0.
- Types: `npm run typecheck` (`vue-tsc --noEmit`) → clean, no output.
- Frozen tests: T01 composer labels without internal names · T02 draft emit → mocked POST → receipt · T03 minted
  `/o/<id>#token` copy link with zero token leakage into call args, URL, or storage · T04 fragment-only token read
  (query empty) → form after mocked redeem · T05 closed error, no form, exactly one redeem call · T06 submit receipt
  with version id · T07 SOP choices + trace + receipt from mocked GET · T08 SOP copy free of
  {bookmark, digest, etag, atom_key, carrier} · T09 rescue public while composer/SOP redirect to `/login` · T10 sidebar
  entry with `requiredRole: 'admin'` · T11 zero storage writes of the token, token absent from path/query · T12
  contradictory include+exclude blocked with a visible message and no request (ExceptionPanel parity).
- Final source/test sha256 (8): types `c6645947`, api `6b37689d`, composer store `23d7174d`, rescue store `92cebdb6`,
  panel `c3e15e48`, labels `fcbb6ced`, form `07189353`, checklist `5e987354`, composer view `11a1cf39`, rescue view
  `4040faee`, SOP view `2dfddd36`, specs `8199e0f2` / `95d63eac` / `a5f83950`.

## Deviations and limits

- RED/GREEN order: implementation was written before the frozen test bodies in this session; RED is demonstrated by
  in-place module removal with byte-identical spec bodies (hashes above) rather than by a pre-implementation run.
- Four assertions were corrected during the first green attempt, all test-side only: option labels live in the
  select stub's option text (not the field label), the SOP trace fixture key is the real
  `existing-plan-benefits-sync@1`, `/o/` was pushed without the fragment so `fullPath` stays `/o/client-a`, and T11
  asserts `pathname`/`search` instead of `window.location.href` because the fragment is the mandated delivery channel.
- `publicPrefixes` is defense in depth: `PublicRoutes` already declares `requiresAuth: false`, so `/o/:id` would not be
  redirected even without it; the prefix allowlist was kept as the coordinator mandated and is the only intended
  public extension.
- The invite locator (`/o/:id`) is routing/display only; the server token is authoritative on redeem and submit. A
  mismatched locator is harmless but is not rejected client-side.
- SOP read is a thin view-level GET through `onboardingApi.getSopVersion` (JWT via fetch-wrapper); it is not routed
  through the composer store, so no blueprint/store coupling was introduced.
- The composer never renders digest, ETag, atom keys, or canonical bytes; receipts show capability counts, lifecycle,
  and the invite lifetime only. The SOP screen intentionally omits the stored digest/canonical bytes to keep operator
  copy inside the closed vocabulary.
- Untested here and left for D4: real staging redeem/submit against a DEMO tenant, expired/tampered/cross-tenant
  negatives, print rendering, and the composer's real JWT-scoped client list.

## Next

D4-UI journey against staging (DEMO tenant only, local `.env.local`, abort on any non-DEMO touch / 500 / external
mutation), then piece close and repo docs. Cap overage decision belongs to the parent.
