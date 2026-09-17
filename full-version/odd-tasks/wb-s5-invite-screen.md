# WB Magic-Link Onboarding — Piece 1 S5 Frontend Evidence (Minimal Invite Screen)

Status: GREEN, not committed / not deployed (frontend `main` auto-deploys to production through Vercel, so pushing is a
production action and is forbidden for this unit).

## Scope and preservation

- Frontend-only, inside `open-dental-dashboard-frontend/full-version/`: 2 new files + 1 minimal touch (6 added lines).
- Backend was read read-only (`open-dental-dashboard-backend-worktrees/workflow-builder-main-integration/`) to pin the
  two chained contracts, never modified: `app/routes/client_routes.py` (`POST /api/v1/clients`, admin role) with
  `app/schemas/client_schema.py` (`client_name` required; `product_type` required and `OneOf["Lunna","Diva","Custom"]`;
  unknown fields raise), and `app/routes/workflow_builder_onboarding_invite_routes.py`
  (`POST /api/v1/workflow-builder/onboarding-invites/mint`, JWT + explicit client write, returns
  `{link, expires_at, expires_days}` where `link` ends in `#token`).
- No commit, push, MR, merge, deploy, migration, or live-system call. No dependency, env var, or secret added.
- `src/api/onboarding.ts` was **not** touched: `onboardingApi.mintInvite(clientId)` and the existing client store
  `useClientStore().createClient()` were reusable as-is, so the optional surface stayed closed.
- `git status` still shows only the pre-existing `M ../.gitignore` and untracked `.pi-lens/`, untouched by this unit.

## Product decision applied

Onboarding entry is now ONE dialog on top of the composer view: client name + contact email → invite link. No product
type, Slack fields, QA ids, or days-in-advance are asked for; the old full form stays edit-only for existing clients.
The link is minted by chaining the existing client-create path and the existing mint endpoint, so no backend change is
required. The email is the delivery target rendered in the success state; nothing is emailed by this screen in v1.

## Surfaces

| File                                                        | New/touch |   Lines |
| ----------------------------------------------------------- | --------- | ------: |
| `src/components/onboarding/InviteClientDialog.vue`          | new       |     198 |
| `src/views/onboarding/__tests__/InviteClientDialog.spec.ts` | new       |     213 |
| `src/views/onboarding/OnboardingComposer.vue`               | touch     |      +6 |
| **total added lines**                                       |           | **417** |

Cap was 500 new lines (added lines in touched files) → **under cap by 83**, nothing trimmed and no declared surface
dropped. `git diff --stat` for the touched file: `full-version/src/views/onboarding/OnboardingComposer.vue | 6 ++++++`,
`1 file changed, 6 insertions(+)`; the two new files are untracked additions.

## Acceptance evidence (TDD)

- RED: with `InviteClientDialog.vue` absent, the frozen spec fails on import resolution —
  `Test Files 1 failed (1)`, `Tests no tests`. Frozen spec sha256 (8) at RED: `77f6cedd`.
- GREEN: `npm test -- src/views/onboarding/__tests__/InviteClientDialog.spec.ts` → `Test Files 1 passed (1)`,
  `Tests 7 passed (7)`, exit 0 (first green attempt, no test-side corrections were needed).
- Regression: full `npm test` → `Test Files 42 passed (42)`, `Tests 187 passed (187)` (41/180 pre-existing + this spec),
  exit 0.
- Types: `npm run typecheck` (`vue-tsc --noEmit`) → clean, no output, exit 0.
- Hook chain (mandated order — chain first, verify after): `npx prettier --write` + `npx eslint --fix` on the three
  touched files with the root `.lintstagedrc`, then `npm run build` (the pre-commit hook's second step: `vue-tsc` +
  `vite build` + `check:bundle`) → build succeeded, `Bundle index-Bl-bCioS.js: raw=1243 KiB, gzip=373 KiB`. All three
  source hashes were byte-identical before and after the build, so the post-hook verification stands.
- Re-verified **after** the hook: spec `7 passed (7)`, full suite `42 passed (42)` / `187 passed (187)`, typecheck exit 0.
- Final sha256 (full): component `39f0666cf64278c77c94f502273b9ca6e93b91d8a0a268e7aff086c0f4829c52`, spec
  `629e56f24461c0060e30d756702d671e2382d8359285d48ced4183588f2a8d2a`, composer
  `86b34bf2b97ca571c897a54c1e7c6e05e888bb1fc3ab5c1df51871d8146dca30`.
- Formatter bite confirmed and sequenced correctly: `prettier --write` DID rewrite the spec (`77f6cedd` → `629e56f2`,
  211 → 213 lines) and the composer (`26fed681` → `86b34bf2`); the component was already prettier-clean. The rewrites
  are line-wrapping only (`prettier --check` now clean, all 7 test bodies and assertions intact), and they landed
  before the final verification run.

## Frozen tests (T01–T07, all implemented, none trimmed)

- T01 asks only for the client name and the contact email · exactly two inputs (`invite-name`, `invite-email`), submit
  and cancel present, no `select`, no product-type/Slack/days-in-advance copy.
- T02 blocks an invalid email with a visible message and enables the link once the email is valid · invalid input shows
  `invite-email-message`, submit is disabled, clicking issues no request, and the valid input clears the message and
  re-enables submit.
- T03 creates the client shell first and then mints the invite for that created client · `createClient` called once with
  `{ client_name, product_type }`, `mintInvite` called once with the created `client-new` id (never the typed name),
  invocation order asserted, success link is `/o/client-new#…`.
- T04 shows the fragment link, the copy action and the expiry without leaking the token · link is
  `${origin}/o/client-new#token`, expiry note reads the server lifetime (`7 days`), the 3-step client preview renders,
  copy writes exactly the link and shows the copied state; the token is absent from query/path, `localStorage`,
  `sessionStorage`, both mocked call logs, and every `console` level.
- T05 renders the closed diagnostic, keeps the entries and reuses the shell when minting fails · 404 renders the closed
  line, the server's own `Resource not found` prose is never rendered, no link appears, both typed values survive, and a
  retry mints again without creating a second client.
- T06 closes the client-creation failure and never mints · closed copy shown, the server/validation prose and the
  internal `Lunna` value are not rendered, `mintInvite` never called.
- T07 keeps every state of the dialog copy free of internal authoring names · the pre-submit and success states both
  avoid bookmark, digest, etag, atom_key, carrier, enrichment, product type, tier, webhook.

## Decisions and deviations (for ratification)

1. **`product_type` value (`Lunna`) is sent but never asked.** The backend `ClientCreateSchema` requires
   `product_type ∈ {Lunna, Diva, Custom}`, and v1 forbids a backend change, so the shell carries the existing
   client-create default used by `ClientList.vue` verbatim rather than a new invented value; the dialog never renders
   it (T06 guards that). Changing it to `Custom` (or making it optional server-side) is a product decision outside this
   brief's authority. **Needs ratification.**
2. **`src/components/onboarding/clientLabels.ts` was not touched.** The brief says "client copy in the S4 dictionary
   module only", but that module is not in the allowed surfaces list; the dialog's closed copy therefore lives in the
   component and is guarded by T07. If the dictionary must own it, that is a new authorized surface.
3. **Closed diagnostics are mapped from the HTTP status, not from server prose.** The mint endpoint returns no
   diagnostics payload, so a small closed status map (401/403/404/409/429 + one fallback) renders the operator line;
   the server's raw message is never displayed. This mirrors the composer store's existing `authorizeDenial` precedent.
4. **The realistic mint failure is 404.** `require_workflow_blueprint_access` raises `NotFoundError` when the acting
   admin has no active `WorkflowBlueprintClientAccess` row — which is exactly the state of a freshly created shell, so
   the closed line for 404 ("not open for onboarding yet") is the one operators will actually see until the grant
   exists.
5. **A failed mint reuses the created shell.** A second submit after a mint failure skips client creation, so a retry
   cannot produce a duplicate client. This is one extra assertion inside frozen T05, not a new test.
6. **Language.** The button label is the brief's Spanish `Invitar cliente`; the dialog's own copy is English to match
   the S4 client dictionary. Flagged for consistency review (T07's ban list is English).
7. **Untested here and left for D4:** the real chain against staging (DEMO tenant only), the real 404-vs-granted mint
   behavior, clipboard behavior in a real browser, and print/render checks.

## Next

D4-UI journey against staging (DEMO tenant only, local `.env.local`, abort on any non-DEMO touch / 500 / external
mutation), then piece close and repo docs. The documentation-inventory row for this new Markdown file, plus the piece
doc/runbook updates, remain part of the piece close (they live outside this frontend session's allowed surfaces).
