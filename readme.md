# Open Dental Automation Dashboard — Frontend

> **Version**: 1.2 — 2026-03-22
> **Built on**: Berry Vuetify Admin Template (v1.6.0)
> **TypeScript**: `vue-tsc --noEmit` passes with 0 errors

Dashboard UI for managing insurance verification writebacks and patient credit identification across multi-tenant dental practices.

> For the full system architecture, see [`architecture_documentation.md`](../architecture_documentation.md) in the workspace root.

## Features

- **Operations Hub** — KPI cards, job status overview, recent activity feed
- **Writeback Management** — Job queue with clinic-wise view, live activity monitoring, circuit breaker status
- **Credit Dashboard** — Business intelligence with 4 KPI cards, aging/disposition/exception/type charts
- **Admin Console** — Clients, clinics, users, pipelines, templates, system logs
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

- Node.js 18+
- Backend API running (see [backend README](../open-dental-dashboard-backend/README.md))

### Setup

```bash
cd open-dental-dashboard-frontend/full-version

# Install dependencies
npm install

# Configure API endpoint
# Create or edit .env with:
#   VITE_API_URL=http://localhost:5000/api/v1

# Start dev server
npm run dev
```

The app starts at `http://localhost:5173`.

### Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `npm run dev` | Vite dev server with HMR |
| `build` | `npm run build` | Type-check + production build |
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
| `/credit` | CreditDashboard | Credit |
| `/credit/records` | CreditRecords | Credit |
| `/credit/records/:id` | CreditRecordDetail | Credit |
| `/credit/runs` | CreditRuns | Credit |
| `/profile` | UserProfile | Profile |

**Navigation guard** (`router/index.ts`): Redirects unauthenticated users to `/login`. Redirects authenticated users from `/login` to `/dashboard/default`.

### State Management (Pinia Stores)

Each module has its own Pinia store using the **Composition API** (`defineStore` with setup function):

| Store | Key State | Key Actions |
| --- | --- | --- |
| `auth` | `user`, `access_token`, `refresh_token` | `login()`, `refresh()`, `logout()` |
| `clients` | `clients`, `loading`, `error` | `fetchClients()`, `createClient()`, `updateClient()` |
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

The `dist/` folder is a fully static SPA. Configure your hosting to serve `index.html` for all routes (SPA fallback).

## License

Proprietary — Internal use only.
