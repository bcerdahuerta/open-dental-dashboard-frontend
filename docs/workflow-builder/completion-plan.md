# Workflow Builder — Durable Completion Plan
> **2026-09-14 — planning only.** This plan routes remaining Workflow Builder work. It adds no runtime, provider, certification, activation, deployment, or delivery authority. Statuses are explicit labels, never completion percentages. Its leading checkpoint supersedes earlier "next action" prose; all prior history is retained unchanged.

> **2026-09-15 — environment break (no product code affected):** npm `gentle-pi` v2.8.0 runtime is gone (only PATH `gentle-ai` 2.6.0 remains); native SDD records are unreadable for every change (`SDD runtime record is not canonical`; acquire reports `corrupt_authority`); `sdd-apply` still resolves to `opencode-go/deepseek-v4.1-flash` per `C:/Users/bisma/.pi/gentle-ai/models.json`; the backend coordinator session is offline with the RA-05 admission orphaned `running/0`.
> **Rule:** no B apply/verify launches until native authority is readable again; planning, docs, and read-only work continue.

Read with the [session handoff](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/session-handoff.md) (current continuation pointer), [product roadmap](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/product-roadmap.md), [target architecture](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/target-architecture.md), [coverage traceability](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/coverage-traceability.md), [decision register](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/decision-register.md), and [reconciliation audit](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/reconciliation-audit.md).

## Status vocabulary

| Label | Meaning |
|---|---|
| `IMPLEMENTED_LOCAL` | Code/spec exists with bounded local evidence. No integration, activation, or live authority. |
| `UNPROVEN` | Implemented or partly implemented, but a required proof is missing or not present in the recorded snapshot. |
| `NOT_STARTED` | No accepted implementation exists. |
| `EXTERNAL_GATE` | Blocked on authority, accounts, grants, provider conformance, or an external platform; not executable locally. |

## Three distinct milestones (never merged)

| # | Milestone | Status | Boundary |
|---|---|---|---|
| M1 | Complete local synthetic E2E acceptance (definition of done) | `NOT_STARTED` — plan defined here | Compiles locally with injected deterministic synthetic adapters and data. Local-only, non-operational authority. |
| M2 | First real current-topology pilot readiness | `EXTERNAL_GATE` | Real named clinic/release/cohort on today's CCC + Rocketbot + Sheets topology. |
| M3 | Full roadmap Phases 5–8 (scale, provider, channel, agent, retirement) | `NOT_STARTED` / `EXTERNAL_GATE` | Not all prerequisites for M2; not cancelled and not claimed complete. |

**Hard rule:** a synthetic adapter result never qualifies a real release. Simulated provider readback, receipts, or digests are local fixtures only and cannot satisfy certification, clinic binding, provider conformance, or retirement evidence.

## Acceptance journey (target)

Author → approved exact Blueprint version → immutable compiled release (deterministic digest) → certification → Clinic Binding `VERIFIED`/`ACTIVE` → FBD/ELG/NO_ACTION policy evaluation with qualified evidence → pinned provider execution result → Benefits Sync exact plan → writeback attempt → exact post-write readback → append-only recovery/finalization.

Every step is a gate. A later step never runs on an unproven earlier step, and pre-effect ambiguity (`AMBIGUOUS`/`INCOMPLETE`/`STALE`) blocks before any effect; `OUTCOME_UNKNOWN` is reserved for a possible external effect that cannot be proven.

## Current evidence checkpoint (2026-09-14)

| Unit | Status | Recorded evidence and remaining gap |
|---|---|---|
| RA-01 independent scheduling | `IMPLEMENTED_LOCAL` | Bounded dormant v2 correction verified and append-only synchronized: [verify report](../../openspec/changes/workflow-builder-independent-scheduling-successor/verify-report.md), [sync report](../../openspec/changes/workflow-builder-independent-scheduling-successor/sync-report.md). Consumer integration/activation `UNPROVEN`; archive is optional administration. |
| RA-02 verified-date provenance | `IMPLEMENTED_LOCAL` (38/44 ledger) | 1034 historical GREEN passes; the six original REAL RED gaps are irrecoverable as historical evidence. Do not fabricate RED or redo the whole implementation — record them as `UNPROVEN`. Record: [tasks](../../openspec/changes/workflow-builder-verified-date-provenance-successor/tasks.md), [apply progress](../../openspec/changes/workflow-builder-verified-date-provenance-successor/apply-progress.md). |
| RA-03 content-bound benefits | `IMPLEMENTED_LOCAL` | 16/16 tasks, 330 real B passes, 1027 preservation guards, native apply settlement complete: [B apply progress](../../open-dental-dashboard-backend-worktrees/workflow-builder-main-integration/openspec/changes/workflow-builder-benefits-content-bound-backend/apply-progress.md). Post-terminal documentation is outside the recorded snapshot; closing 277/280 stands with no reset. |
| RA-04 desired semantic admission | `NOT_STARTED` — next | Versioned successor preserving V1 and RA-03: all-domain row identity, qualifiers, dependencies, and pre-effect ambiguity supersession. Not a patch of the empty-tuple check alone. |
| RA-05 component integrity | `NOT_STARTED` | Recompute and bind semantic bytes and digest at the relied-on admission boundary. |
| RA-06 projection linkage | `NOT_STARTED` | Enforced clinic/record ownership chain plus duplicate migration identity `20260906_001`. |
| Frontend authoring fix | `IMPLEMENTED_LOCAL` | [ExceptionPanel.vue](../../open-dental-dashboard-frontend/full-version/src/components/workflow-builder/ExceptionPanel.vue) now blocks submission when add/remove selections contradict, with visible validation and preserved choices; [lifecycle spec](../../open-dental-dashboard-frontend/full-version/src/views/admin/__tests__/WorkflowBuilderLifecycle.spec.ts); context in the [frontend readme](../../open-dental-dashboard-frontend/readme.md). 34 independent focused tests plus typecheck passed using mocked Vue controls — not browser E2E. The writer observed behavioral RED (1 failed / 14 passed); the independent verifier reported GREEN only, so no strict-TDD historical claim is made. |

**RA-03 native state:** fresh B `sdd-status` reports `nextRecommended: verify`, dependencies verify-ready, task 16/16, no blocked reasons or notes, and **no verify report present**. Formal verify/sync stay separate and are not blockers to RA-04; archive remains optional administration.

**RA-04 caution:** exact semantics require evidence mapping over the accepted all-domain `WB-OPEN-016` breadth ([preproposal](../../openspec/changes/workflow-builder-form-bookmark-contract/preproposal.md), [evidence ledger](../../openspec/changes/workflow-builder-form-bookmark-contract/evidence-map.md)). `WB-OPEN-016` and other accepted product decisions are not reopened. The backend coordinator currently maps RA-04 read-only.

## Missing links to M1 (local synthetic end-to-end)

Dependency-ordered work packages, each with a concrete acceptance criterion:

| # | Work package | Depends on | Acceptance criterion | Status |
|---:|---|---|---|---|
| 1 | Finish RA-04 desired semantic admission successor | RA-03 local | Desired completeness is admitted independently of transport completeness; incomplete or conflicting candidates yield no partial plan and no inferred delete. | `NOT_STARTED` |
| 2 | Finish RA-05 component integrity successor | 1 | Divergent payload/bytes/digest rejects even when supplied release metadata matches; deterministic valid content stays accepted. | `NOT_STARTED` |
| 3 | Finish RA-06 projection linkage successor | 2 | Missing or cross-client clinic and mismatched record reject; valid linkage succeeds; migration identity resolved before any apply. | `NOT_STARTED` |
| 4 | Verified-date admission remainder (RA-02) | RA-01 | Raw and frozen period admission verified with full TDD lineage; the six historical gaps stay recorded as `UNPROVEN`, never backfilled. | `UNPROVEN` |
| 5 | Synthetic end-to-end acceptance harness | 1–4 | The journey above runs start-to-finish on injected deterministic synthetic adapters and data, with no real provider, database, or external call, and failures attributable per link. | `NOT_STARTED` |
| 6 | Controlled fresh local PostgreSQL proof | 1–3 | Schema, tenant, and transaction behavior proven on a fresh local database isolated from any live migration and from unresolved existing application history. | `NOT_STARTED` |
| 7 | Browser-level authoring wiring proof | Frontend fix | Mocked-control behavior is replaced or supplemented by real browser wiring for the authoring lifecycle. | `NOT_STARTED` |

Prior SQLite/API and archived UI proofs do not cover PostgreSQL concurrency, grants, or browser wiring; treat them as `IMPLEMENTED_LOCAL` only. Actual existing database application history remains unresolved, and no access is assumed.

## Successor discipline for RA-04/05/06

Each remaining correction is a **versioned successor** that preserves the V1 contracts and the RA-03 records. That means:

- no whole-implementation redo and no rewriting of accepted prior artifacts;
- no reopening of `WB-OPEN-016` or other accepted product decisions;
- evidence mapping before implementation, including concrete all-domain row identity, qualifiers, and dependency closure;
- an updated spec and decision record in the same work unit as the successor behavior;
- the existing pre-effect ambiguity gate retained and superseded, never silently relaxed.

## M1 harness authority boundary

The synthetic end-to-end harness is a test double layer, not a runtime mode:

- adapters, payloads, receipts, and digests are deterministic injected fixtures, labeled local-only in every evidence record;
- no real provider, Open Dental, database, Google Sheets, or network call participates;
- a synthetic pass can never be promoted into certification, provider-conformance, or activation evidence;
- each M1 proof location is a link to an actual repository document, not an invented or copied test command.

## Real pilot gate (M2) — authority stays external

Named clinic, exact release, and approved cohort; real accounts and grants; provider readback, idempotency, and operation conformance per role/operation/scope; `PUT /queries/ShortQuery` reads with complete pagination; secret-reference provisioning (never values); explicit scope, rollback, and monitoring ownership; authorized external mutations. All `EXTERNAL_GATE`. Live staging counts as production. Preserve the current CCC/Rocketbot/Sheets topology; the signed replacement agent is later Phase 8 and is **not** a prerequisite for this pilot.

## Remaining roadmap Phases 5–8 (M3)

Scaled production and service objectives (Phase 5); future carrier conformance and release-scoped authority adoption (Phase 6); native result channel and per-release Sheets retirement (Phase 7); signed workstation agent and unmanaged-legacy retirement (Phase 8). Each requires its own external evidence; none is cancelled and none is claimed complete. See [product-roadmap.md](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/product-roadmap.md) and the [intake-to-retirement proof](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/coverage-traceability.md#intake-to-retirement-completeness-proof).

## Future backend pure-test discipline

Any future backend pure-test unit must run with known fixture isolation — `--noconftest`, addopts disabled, plugin and environment pinned at 1/1/1 — and must not copy unsafe bare `pytest` commands. This plan names required checks only; it executes nothing and fabricates no execution evidence.

## Next action

Continue RA-04 evidence mapping, then the dependency-ordered M1 packages above. No automatic publish, deploy, or reset is implied. Roots, selected worktrees, and the single-writer boundary stay defined in the [session handoff](https://gitlab.nixps.net/open-dental/core/open-dental-dashboard-backend/-/blob/main/docs/workflow-builder/session-handoff.md).

> **Correction 2026-09-15 — no downgrade occurred.** The project runs the latest gentle-shell with ODD (parent-orchestrated delegation); legacy PATH binaries (`gentle-ai` 2.6.0/2.1.11) must NOT be used for native SDD reads, and their `not canonical` errors are expected, not a corrupt record. `deepseek-v4.1-flash` is healthy per user and `sdd-apply` routing is unchanged.
> True blocker: no B-rooted Pi session is running — cross-clone subagent delegation is refused (`Select an existing worktree in the same Git clone as this session`). The user must open a Pi session rooted in the B worktree; that root then hands over resume state (RA-05 admission orphaned `running/0` needs fresh-status recovery).
> No product code affected.
