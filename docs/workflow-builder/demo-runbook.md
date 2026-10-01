# Workflow Builder — Scoped Demo Runbook (local UI vs staging API)

Status: current-supporting. Production nav no longer exposes the builder;
all demo traffic goes to the staging backend. No OD writeback is executed
in this runbook (dry-run plans only).

## 1. Start the UI locally (2 commands)

```powershell
cd C:\Repos\open-dental-automation-dashboard\open-dental-dashboard-frontend\full-version
"VITE_API_URL=https://dashboard-backend-staging-120404883191.us-central1.run.app" | Out-File -Encoding utf8 .env.local
npm run dev
```

`.env.local` is machine-local (never commit it). The dev server proxies
nothing: the app calls staging directly with your admin JWT after login.

## 2. Create the DEMO tenant (through the UI, no direct DB writes)

1. Log in with your admin user.
2. Clients → create client named exactly `DEMO Builder Pilot`
   (description: synthetic tenant, safe to delete).
3. Inside it create 2 clinics: `DEMO Clinic A`, `DEMO Clinic B`.
4. Never select a real client during the demo walkthrough.

## 3. Walk the Builder flow on the DEMO tenant only

Open `/admin/workflow-builder` directly (no nav entry by design).
P1 catalog/composer/preview/draft → P2 review/approve (read the receipt,
note the `CLIENT_APPROVER_ONLY` semantics) → P3 sparse exception
(try the overlap guard: same atom add+remove must block with a message)
→ P4 binding display → P5 evaluation detail → P6 benefits/desired
admission with the exact writeback plan previewed and NOT executed →
P7 negatives (disjoint violation, cross-tenant clinic id, forged digest).

## 4. Abort rules

- Any step touching a non-`DEMO` record: stop immediately.
- Any `500`/traceback: screenshot + stop; do not retry blindly.
- Writeback execution buttons do not exist in this UI slice; if one
  ever appears, do not press it without a named canary approval.

## 5. Cleanup (optional)

Delete the two DEMO clinics and the DEMO client from the dashboard,
or keep them labeled for the next round. Record the round result in
the pilot log before deleting anything.
