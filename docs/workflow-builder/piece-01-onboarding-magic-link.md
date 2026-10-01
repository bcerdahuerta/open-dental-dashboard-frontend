# Piece 1 — Onboarding por Link Mágico (piece documentation)

Status: **CLOSED (piece 1) 2026-09-18.** D1–D5 complete with live evidence; deployed to production (backend + frontend);
D4 journey verified by both parties (agent API assertions + CEO-as-client walkthrough). Staging IS production.
Piece 2 (extraction rules) opened.

## Product essence (human decision, not reopenable here)
Self-service standardized onboarding: the client assembles their flow from OUR closed capability catalog —
no inventions — replacing today's free-format submissions. The magic link IS Workflow Builder's entry point:
we generate it, ops sends it, the client onboards themselves in client language.

## Scope (corrected build order #1)
Rule authoring in client language + directed invite link (admin shells the tenant, link invites the contact)
+ frontend composer/rescue/SOP + operator SOP double-check. Draft-only link power (approval stays a separate
ritual). Explicitly OUT: approval-via-link, email sending, writeback execution, provisioning-anonymous signup.

## Slices and frozen contracts

| Slice | What | Tests (frozen RED→GREEN) | Deploy state |
|---|---|---|---|
| S1 pure admission | `author_onboarding_draft_v1` over catalog v1 + verification profile; DRAFT-only, `activatable=false`, internal receipt digest | 14/14 + 43 regression | `00451-cus` → superseded by S3 revision |
| S2 draft API | `POST .../clients/<id>/onboarding-draft/draft` (JWT + explicit client write) | 12/12 + 57 regression | same as S1 |
| S3a invite journey | `POST .../onboarding-invites/mint` (JWT write) + `/redeem` + `/submit` (public, 5/min); stateless short-JWT (existing secret, 7-day TTL); submit persists via existing version-append with token-scoped authorize | 12/12 + 69 regression | `00455-giq` at 100% |
| S3b SOP read | `GET .../clients/<id>/onboarding-sop/versions/<version_id>` (JWT read, tenant-scoped, digest recompute verification) | 8/8 + 81 regression | same revision |
| S4 frontend | composer (`/admin/onboarding`, visible admin entry) + public rescue (`/o/:id`, fragment-only token) + SOP screen (`/admin/onboarding/versions/:clientId/:versionId`) | 12/12 + 180 regression, typecheck clean | MR !5 merged → Vercel production |

Closed client vocabulary (never violated — guarded by tests at every layer): FBD/ELG, states, coverages.
NEVER in user copy: bookmarks, forms, digests, ETags, atom_keys, carrier internals.

## Decisions (human — see odd notes for evidence)
- Backend-only S1/S2 first (no-mix rule), then extended piece 1 with S3+S4 (frontend session via intercom).
- JWT + explicit access for internal APIs; stateless short-JWT invite (no migration, no new secret); TTL 7 days; ops sends the link manually.
- Directed link (shell-first, no anonymous provisioning); draft-only power; SOP as read projection (no doc pipeline).
- S4: short `/o/:id`, screen-only SOP, visible admin composer. Technical folds: plain-TS label module, page-memory token, `/o/` prefix allowlist, plain fetch for public calls.
- Closure DoD per piece: D1 unit → D2 branch/commit/push (+MR stewardship) → D3 deploy-verified → D4 real journey test → D5 traffic with named rollback. A piece closes only at D4+D5 with evidence; size/scope exceptions need explicit human grant (never inferred).

## D4 result — PASS (2026-09-18)
Part A (agent, live, revision `00461-gab`): ALL PASS — bootstrap, mint, redeem, submit (version `75679130…`,
digest `sha256:44bb67b5…`), exact S2 digest parity, SOP read with identical receipt, negatives fail-closed
(no-JWT 401, tampered 401, contradictory → null draft, unknown archetype → null draft), closed-vocabulary scan
clean, no external mutations.
Part B (CEO as expert client, production UI): user-generated invite link → incognito rescue → completed → submitted
→ operator received it. Verdict from the CEO: works as expected; rough around the edges (polish is a later UX
concern, not a functional gap). Two coordinator false alarms were dissected and retracted (missing bootstrap was
designed behavior; the SOP check used a wrong assertion path) — the product behaved correctly in both.

## Live state at close
Backend serving `dashboard-backend-staging-00461-gab` at 100% (rollback `00459-tuv`); frontend production on Vercel
(post MR !5–!9). DEMO tenant live for future tests. Coverage completion landed test-only (commit `6344294`,
105/105 piece set green).

## Size-grant ledger (CLOSED under the CEO technical-leadership mandate 2026-09-18; reversible — say the word)
The CEO delegated technical leadership and asked not to be consulted on technical matters. Every overage below
was coverage-preserving (no test trimmed, no behavior weakened) and is recorded here as the grant record:
S1 575/400 (explicit earlier grant); S3a 1048/850; S3b 855/600; S4 1540/1200; S6 ~540/450; S7 within cap (~330/450).
Untested-branch fate RESOLVED: invite 404/409 branches and the SOP integrity 409 are now covered (commit
`6344294`, 4 new tests, raw-SQL tamper for the immutable-evidence case, 105/105 piece set green, test-only —
no deploy required).

## Deploy evidence
- Backend: `00451-cus` (S1+S2) then `00455-giq` (S1–S3b) at 100%; carry-forward 88/88 env + 19/19 secrets byte-identical incl. canaries; health/readiness green; zero ERROR logs. Rollback: `00453-vut`.
- Frontend: branch `feature/wb-onboarding-s4` → MR !5 (reviewed: mergeable, no conflicts, no MR pipelines in this project) → approved → merged → main pipeline success → Vercel live (`/` + `/o/` 200).
- Live-state discipline applied throughout: serving revision re-verified before every action (00360→00361→00451→00453→00455 drift recorded, never trusted from docs).

## Test evidence locators
- S1: `odd/tasks/wb-magic-link-onboarding-s1.md` (backend worktree) — 14 IDs, DoD, staging-is-production correction, size grant.
- S2: `odd/tasks/wb-magic-link-onboarding-s2.md` — 12 IDs, +2/-0 repair record, D3+D5 live evidence.
- S3a: `odd/tasks/wb-magic-link-onboarding-s3a.md` — 12 IDs, second-churn repair record.
- S3b: `odd/tasks/wb-magic-link-onboarding-s3b.md` — 8 IDs, recompute-boundary deviation.
- S3a+S3b commit `99eada9` (pushed); S1+S2 commit `60d44b8` (pushed); S4 brief + S2-live-evidence commit `2abfbf9` (pushed).
- S4: `full-version/odd-tasks/wb-s4-onboarding-composer.md` (frontend repo) — 12 IDs, flake read (environmental), cap report. Commit on `feature/wb-onboarding-s4`, MR !5.
- Post-merge clarification (S4 session report, coordinator re-verified): the merged bytes are NOT identical to the RED/GREEN-evidenced bytes — husky/lint-staged reformatted 3 files at commit (`InviteRescue.vue`, `InviteRescue.spec.ts`, `OnboardingComposer.spec.ts`; 11/14 files byte-exact). Deployed state proven green independently by BOTH parties on the exact committed tree (session: 180 + typecheck; coordinator: 12/12 in 11s warm). Lesson for future frontend units: run the hook chain BEFORE final verification, or re-verify post-commit as done here. No note edit was made in the frontend repo (avoids a docs-only production deploy); this entry is the record.
- D4 artifact (this piece's journey test): [piece-01-d4-runbook.md](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/piece-01-d4-runbook.md).

## What piece 1 is NOT
Not writeback, not approval, not email delivery, not anonymous signup, not a third verification type,
not a document-generation pipeline, not full-product completion. Simulator (piece 3 now) and extraction rules
(piece 2) are the next pieces.
