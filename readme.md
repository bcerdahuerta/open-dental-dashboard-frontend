# Open Dental Automation Dashboard — Frontend

> **Version**: 1.2 — 2026-03-22
> **Built on**: Berry Vuetify Admin Template (v1.6.0)
> **TypeScript**: `vue-tsc --noEmit` passes with 0 errors

Dashboard UI for managing insurance verification writebacks and patient credit identification across multi-tenant dental practices.

> This README is the frontend entrypoint for local setup, architecture notes, and contributor workflow.
> For the cross-repo architecture overview, see [`architecture_documentation.md`](./architecture_documentation.md).
> For the backend API setup, see the [backend README](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-backend/-/blob/main/README.md?ref_type=heads).
> For contribution rules, branch workflow, and Merge Request expectations, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Features

- **Operations Hub** — KPI cards, job status overview, recent activity feed
- **Writeback Management** — Job queue with clinic-wise view, live activity monitoring, circuit breaker status
- **Credit Dashboard** — Business intelligence with 4 KPI cards, aging/disposition/exception/type charts
- **Extraction Robot Monitor** — `/main/extraction/robots` monitor with per-workstation **Deregister** action for admin/operator roles
- **Admin Console** — Clients, clinics, users, pipelines, templates, system logs
- **Client Automations Panel** — Internal client automation rule/run summaries embedded in Client Management without patient-level detail
- **Profile Resolution** — Resolution hierarchy management with simulator, base profiles, client assignments, and clinic overrides
- **Clinic Configuration** — Full config editor with tabs for credentials, benefit/frequency/age-limit mappings, fee schedules
- **RBAC** — Role-aware navigation and actions (Superuser, Admin, Operator, Viewer)
- **JWT Auth** — Access/refresh token flow with automatic refresh on 401

## Tech Stack

| Layer | Technology | Version |
| --- | --- | --- |
| **Framework** | Vue 3 (Composition API, `<script setup>`) | 3.5 |
| **UI Library** | Vuetify 3 (Berry Admin Theme) | 3.9 |
| **State** | Pinia | 3.0 |
| **Routing** | Vue Router 4 | 4.5 |
| **HTTP** | fetch API (`fetchWrapper`) | native |
| **Charts** | ApexCharts (vue3-apexcharts) | 1.8 |
| **Build** | Vite 7 | 7.0 |
| **Type Check** | TypeScript + vue-tsc | 5.9 |
| **Styling** | SCSS + Vuetify theming | — |

---

## Quick Start

### Prerequisites

- Node.js 20+ recommended (Node.js 18+ minimum)
- Backend API running at `http://localhost:5000` (see the [backend README](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-backend/-/blob/main/README.md?ref_type=heads))

### Local development

1. Install dependencies.

   ```powershell
   cd open-dental-dashboard-frontend\full-version
   npm ci
   ```

2. Create `.env` in `open-dental-dashboard-frontend/full-version/`.

   ```env
   VITE_API_URL=http://localhost:5000/api/v1
   ```

   `VITE_API_URL` must point to the backend API. Do not put secrets in `VITE_` variables because they are exposed in the browser bundle.

3. Start the dev server.

   ```powershell
   npm run dev
   ```

The app starts at `http://localhost:5173`.

Use the seeded backend admin account for local login when available. Generate or obtain the local seed password through the backend-approved seeding workflow; do not commit default passwords to docs or source control.

```text
admin@dentalrobot.com
<local-seeded-admin-password>
```

If login fails, verify that the backend is running, migrations were applied, `flask --app wsgi.py seed` was executed, and `VITE_API_URL` matches the backend URL.

### Legacy quick commands

These commands are kept as a compact reference, but the local development steps above are preferred for a fresh workstation.

```bash
cd open-dental-dashboard-frontend/full-version

# Install dependencies
npm ci

# Configure API endpoint
# Create or edit .env with:
#   VITE_API_URL=http://localhost:5000/api/v1

# Start dev server
npm run dev
```

### Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `npm run dev` | Vite dev server with HMR |
| `build` | `npm run build` | Type-check + Vercel/root production build |
| `typecheck` | `npm run typecheck` | `vue-tsc --noEmit` only |
| `lint` | `npm run lint` | ESLint with auto-fix |
| `preview` | `npm run preview` | Preview production build (port 5050) |

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Backend API base URL (e.g., `http://localhost:5000/api/v1`) |

All environment variables must be prefixed with `VITE_` to be exposed to the client bundle.

---

## Project Structure

```
full-version/src/
├── App.vue                        # Root component
├── main.ts                        # App entry point (plugins, router, Pinia)
├── config.ts                      # UI config (sidebar, theme, layout)
│
├── router/
│   ├── index.ts                   # Router instance + auth navigation guard
│   ├── MainRoutes.ts              # Auth-required routes (all app pages)
│   └── PublicRoutes.ts            # Public routes (login, register)
│
├── stores/                        # Pinia state management
│   ├── auth.ts                    # JWT login/refresh/logout, user state
│   ├── clients.ts                 # Client CRUD operations
│   ├── clientAutomations.ts       # Internal automation rule/run summaries
│   ├── clinics.ts                 # Clinic CRUD + config tabs + enrollment
│   ├── credit.ts                  # Credit module (summary, runs, records, clinics)
│   ├── writeback.ts               # Job queue, stats, circuit breaker, live feed
│   ├── profileResolution.ts       # Profile resolution state (bases, assignments, overrides)
│   └── customizer.ts              # UI theme/layout preferences
│
├── types/
│   ├── credit.ts                  # CreditSummary, CreditRun, CreditRecord, etc.
│   ├── writeback.ts               # WritebackJob, QueueStats, JobsPagination
│   ├── profileResolution.ts       # ProfileResolution, ResolutionInput, ResolutionResult
│   ├── clientAutomations.ts       # ClientAutomationRuleSummary, ClientAutomationRunSummary
│   └── vue-apexcharts.d.ts        # ApexCharts type shims
│
├── views/
│   ├── authentication/            # Login, Register pages
│   ├── dashboards/default/        # Operations Hub (KPIs, activity feed)
│   ├── admin/
│   │   ├── ClientList.vue         # Client CRUD table
│   │   ├── ClinicList.vue         # Clinic cards with status
│   │   ├── ClinicDetail.vue       # Full config editor (6 tabs)
│   │   ├── UserApproval.vue       # User management + approval workflow
│   │   ├── SystemLogs.vue         # Paginated execution log viewer
│   │   ├── PipelineList.vue       # Pipeline profile management
│   │   ├── TemplateList.vue       # Note template CRUD
│   │   └── ProfileResolution.vue  # Profile resolution management (4 tabs)
│   ├── writeback/
│   │   ├── JobQueue.vue           # Per-clinic job queue with filters
│   │   └── LiveActivity.vue       # Real-time job monitoring + execute
│   ├── credit/
│   │   ├── CreditDashboard.vue    # BI dashboard (KPIs + 4 charts)
│   │   ├── CreditRuns.vue         # Run history + manual trigger
│   │   ├── CreditRecords.vue      # Paginated records table
│   │   └── CreditRecordDetail.vue # Single record with exceptions
│   └── profile/
│       └── UserProfile.vue        # User settings
│
├── components/
│   ├── shared/                    # Reusable UI primitives
│   │   ├── UiParentCard.vue       # Standard card wrapper
│   │   ├── UiChildCard.vue        # Nested card
│   │   ├── WidgetCard.vue         # KPI widget card
│   │   └── BaseBreadcrumb.vue     # Page breadcrumbs
│   ├── admin/
│   │   └── ClientAutomationsPanel.vue # Summary-only internal automation panel
│   └── writeback/
│       └── JobDetailDrawer.vue    # Job detail side panel + compensation log
│
├── layouts/
│   ├── full/                      # Main layout (sidebar, header, content)
│   └── blank/                     # Auth layout (no sidebar)
│
├── utils/
│   ├── axios.ts                   # Axios instance (unused — fetchWrapper preferred)
│   └── helpers/
│       ├── fetch-wrapper.ts       # HTTP client with JWT auto-refresh
│       └── fake-backend.ts        # Mock API for demo mode
│
├── plugins/                       # Vuetify, i18n plugin registration
├── theme/                         # Vuetify theme customizations (colors, typography)
├── scss/                          # Global SCSS styles
└── assets/                        # Static assets (images, icons)
```

---

## Architecture

### Routing

All authenticated routes live under `MainRoutes.ts` with `meta: { requiresAuth: true }`:

| Route | Component | Module |
| --- | --- | --- |
| `/dashboard/default` | DefaultDashboard | Operations Hub |
| `/admin/clients` | ClientList | Admin |
| `/admin/clinics` | ClinicList | Admin |
| `/admin/clinics/:id` | ClinicDetail | Admin |
| `/admin/users` | UserApproval | Admin |
| `/admin/logs` | SystemLogs | Admin |
| `/admin/pipelines` | PipelineList | Admin |
| `/admin/templates` | TemplateList | Admin |
| `/admin/profile-resolution` | ProfileResolution | Admin |
| `/writeback/queue` | JobQueue | Writeback |
| `/writeback/live` | LiveActivity | Writeback |
| `/main/extraction/robots` | RobotMonitor | Extraction |
| `/credit` | CreditDashboard | Credit |
| `/credit/records` | CreditRecords | Credit |
| `/credit/records/:id` | CreditRecordDetail | Credit |
| `/credit/runs` | CreditRuns | Credit |
| `/profile` | UserProfile | Profile |

**Navigation guard** (`router/index.ts`): Redirects unauthenticated users to `/login`. Redirects authenticated users from `/login` to `/dashboard/default`.

**Robot Monitor deregistration semantics** (`/main/extraction/robots`):

- The **Deregister** row action calls `DELETE /api/v1/robots/workstations/{workstation_id}`.
- Successful delete removes the workstation from the table immediately and recomputes counts (no disabled-row fallback).
- If the robot process is still running, a future valid heartbeat can auto-register the same workstation name again and the row can reappear as `HEALTHY`.
- Delete authorization is enforced server-side for `admin` and `operator` roles.

### State Management (Pinia Stores)

Each module has its own Pinia store using the **Composition API** (`defineStore` with setup function):

| Store | Key State | Key Actions |
| --- | --- | --- |
| `auth` | `user`, `access_token`, `refresh_token` | `login()`, `refresh()`, `logout()` |
| `clients` | `clients`, `loading`, `error` | `fetchClients()`, `createClient()`, `updateClient()` |
| `clientAutomations` | `rules`, `runs`, `loading`, `error` | `fetchRules()`, `fetchRuns()`, `updateRuleEnabled()`, `createManualRun()` |
| `clinics` | `clinics`, `selectedClinic`, `benefitMappings`, ... | `fetchClinics()`, `fetchClinicDetail()`, config CRUD |
| `writeback` | `jobs`, `queueStats`, `clinicStatsMap`, `selectedJob` | `fetchJobs()`, `executeJob()`, `fetchQueueStats()` |
| `credit` | `summary`, `runs`, `records`, `creditClinics` | `fetchSummary()`, `fetchRuns()`, `triggerRun()`, `fetchRecords()` |
| `profileResolution` | `baseProfiles`, `clientAssignments`, `clinicOverrides` | `fetchBaseProfiles()`, `resolveProfile()`, `createAssignment()`, `updateOverride()` |

### HTTP Client (`fetchWrapper`)

All API calls go through `utils/helpers/fetch-wrapper.ts`:

```typescript
export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  patch: request('PATCH'),
  delete: request('DELETE')
};
```

**Key features:**
- Automatic `Authorization: Bearer {token}` header for API URLs
- **Auto-refresh on 401**: If a request gets a 401, it refreshes the token and retries once
- Response unwrapping: Returns `data.data` if nested (backend envelope format)
- On refresh failure: Logs out the user

### Credit Dashboard

The credit module provides actionable business intelligence:

**KPI Cards** (4):
1. **Total Credit Exposure** — Dollar amount with currency formatting
2. **Patients Affected** — Count of patients with credit balances
3. **Avg Credit Age** — Days since credit appeared (orange >90d warning)
4. **Action Required** — Patients needing contact/refund/review

**Charts** (4, all ApexCharts):
1. **Aging Distribution** — Horizontal bar chart with color-coded buckets (green→red)
2. **Recommended Actions** — Donut chart showing disposition breakdown with center total
3. **Top Exceptions** — Data table with severity badges (High=red, Medium=orange, Low=green)
4. **Credit by Type** — Vertical bar chart per credit classification

> **Security**: No internal UUIDs are exposed in the UI. Clinic filter uses `clinic_name` from the API.

### Profile Resolution (`ProfileResolution.vue`)

Manages the resolution hierarchy for determining the effective profile for any clinic. This is a multi-tab admin interface under Management in the sidebar.

**Route**: `/admin/profile-resolution`

**Tabs** (4):

| Tab | Purpose | Actions |
| --- | --- | --- |
| **Simulator** | Test resolution logic before applying | Remote clinic search, `has_shortform` toggle, preview with `resolve-explain` |
| **Base Profiles** | View available profile catalogues | Read-only table (name, ID, description) |
| **Client Assignments** | Assign base profiles to clients | Side panel for create/edit, precedence 0-100, soft-delete |
| **Clinic Overrides** | Per-clinic profile overrides | Side panel for create/edit, priority over assignments |

**Resolution Simulator**:
- Search clinics by remote API (`POST /profile-resolution/search-clinics`)
- Run preview (`GET /profile-resolution/preview`) with `has_shortform` toggle
- See detailed explanation from `resolve-explain` endpoint (which assignment/override matched and why)

**Guardrails**:
- **Preview required** — Cannot save an assignment/override without running preview first
- **Precedence bounds** — 0-100 for assignments/overrides (validated client-side)
- **Soft delete** — Assignments/overrides are soft-deleted, not hard-removed

**Types** (`src/types/profileResolution.ts`):
- `BaseProfile` — Profile catalogue metadata
- `ClientAssignment` — Client → Base Profile mapping with precedence
- `ClinicOverride` — Clinic → Base Profile override with precedence
- `ResolutionInput` — Clinic ID + `has_shortform` flag for simulation
- `ResolutionResult` — Effective profile + explanation trace

**Tests**: 23 Vitest tests covering resolution logic, form validation, and guardrails.

### Client Automations (`ClientAutomationsPanel.vue`)

The Client Management page embeds an internal-only automation summary panel. It intentionally does not add a main sidebar item or patient-level drilldown.

**API path**: `/api/v1/client-automations/*` through `fetchWrapper`.

**Displayed summary fields**:
- Health/configuration summary: backend dispatch readiness, enabled rule count, clinic-scoped count, queue name, dispatch cap, and external scheduler job configuration/verification labels.
- Rule type, enabled state, schedule status, schedule time/timezone, source/target provider abbreviations, next scheduled execution, next target service date, last run status/date, and internal owner.
- Recent run target service date, final status, matched/changed/skipped/failed counts, retry count, and controlled non-PHI failure diagnostics when exposed by the backend (`error_category`, `error_code`, generic sanitized `error_summary`).
- Admin controls remain embedded in Client Management: enable/pause via existing rule update API and manual **Run now** creation using a business-day target date. Successful toggles and manual run requests refresh health so counts do not go stale. Manual runs are queued only when the backend reports the rule ready plus healthy Cloud Tasks dispatch configuration; backend RBAC remains authoritative.

**Privacy guardrails**:
- Do not render patient names, `PatNum`, `AptNum`, appointment notes, action rows, or raw Open Dental error text.
- Treat backend error diagnostics as controlled labels/summaries only; never surface raw API errors or patient-specific detail from store failures.
- Keep this panel under Client Management unless a future spec explicitly creates a dedicated internal admin route.

### Clinic Detail (ClinicDetail.vue)

The most complex page — a tabbed config editor for a single clinic:

| Tab | Content |
| --- | --- |
| Overview | Clinic info, connection status, OD API test |
| Credentials | Encrypted OD API key management |
| Benefits | Benefit mapping table (category, code, code_diff, force_zero) |
| Frequencies | Frequency mapping table (code groups, code nums) |
| Age Limits | Age limit mapping table |
| Fee Schedules | Fee schedule rules + catalogue |

Drive onboarding behavior:

- Create dialog captures both `spreadsheet_id` and `folder_id`.
- Drive status is shown as two sub-statuses (Spreadsheet + Folder) across Clinic List and Clinic Detail.
- Retry actions are resource-scoped from Clinic Detail (`Retry Spreadsheet` / `Retry Folder`) and call backend retry endpoint with `resource` query param.

---

## Development Guidelines

### Adding a New Page

1. Create the Vue component in `views/{module}/YourPage.vue`
2. Add the route to `router/MainRoutes.ts`
3. If new data is needed, create or extend a Pinia store in `stores/`
4. Define TypeScript interfaces in `types/`

### Conventions

- **Composition API only** — All components use `<script setup lang="ts">`
- **Pinia setup stores** — `defineStore('name', () => { ... })`, not options API
- **fetchWrapper** — Do NOT use raw `fetch` or `axios.ts` directly. Always go through `fetchWrapper`
- **Vuetify components** — Use Vuetify primitives (`v-card`, `v-data-table`, `v-btn`, etc.), not custom HTML
- **Berry theme** — Respect the theme tokens in `theme/`. Don't hardcode colors
- **No hardcoded URLs** — All API base URLs via `import.meta.env.VITE_API_URL`

### Type Checking

```bash
# Must pass with 0 errors before any commit
npm run typecheck
```

### Code Style

- ESLint + Prettier for formatting
- SCSS for custom styles (scoped per component)
- Vuetify theming for color/typography consistency

---

## Key Components

### JobDetailDrawer (`components/writeback/JobDetailDrawer.vue`)

Side panel showing:
- Job metadata (status, clinic, patient, timestamps)
- Pipeline execution timeline with step-by-step results
- Compensation log (before/after state for each OD write)

### DefaultDashboard (`views/dashboards/default/DefaultDashboard.vue`)

Operations Hub with:
- Quick stats cards (total jobs, success rate, active clinics)
- Recent activity feed
- Job status distribution chart

### LiveActivity (`views/writeback/LiveActivity.vue`)

Real-time view of running jobs with:
- Auto-refresh polling
- Execute button for pending jobs
- Status badges and progress indicators
- `NO_APPOINTMENT` rows display as **No Appointment** and do not show Retry, because the missing Open Dental appointment is a terminal business outcome rather than a retryable pipeline failure.

### JobQueue Preview→Sync Contract (`views/writeback/JobQueue.vue`)

`Preview Rows` is the source of truth for a sync attempt. The frontend now sends the backend a deterministic selection payload using `selection_key` (`sheet_tab::row_index`) plus snapshot metadata from preview:

- `selections[]` with `row_index`, `sheet_tab`, `selection_key`
- `preview_snapshot_token`
- `preview_generated_at`
- `preview_rows_found`

If the backend detects stale snapshot/mismatch, it returns `409` and the UI shows an explicit stale-preview message instructing operators to refresh preview before syncing.

Operational UX change:

- Removed eager multi-clinic preview prefetch on client selection to reduce load and inconsistency windows.
- Ready row counts on clinic cards are now on-demand (updated when each clinic preview is opened/refreshed).

---

## Build & Deployment

```bash
# Production build (type-check first)
npm run build

# Output goes to dist/
# Deploy as static files to any CDN/hosting
```

Canonical production deployment is Vercel auto-deploy on push to `main`; no manual frontend deploy step is required. The legacy GitHub Actions SSH production deploy to `berrydashboard.com` is disabled and kept validation-only in favor of Vercel.

The production validation workflow must run `npm run build` so CI proves the same root-base Vite contract that Vercel serves. Do not use the legacy `/vue/` `build-prod` script for `main` or Vercel validation.

The `dist/` folder is a fully static SPA. Vercel uses `full-version/vercel.json` to serve `index.html` for all routes (SPA fallback).

## License

Proprietary — Internal use only.
