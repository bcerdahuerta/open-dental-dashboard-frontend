# Open Dental Automation Dashboard — Architecture Overview

> **Status**: standalone architecture overview for the backend and frontend repositories.  
> **Scope**: system boundaries, backend/frontend structure, data flow, local development, and review considerations.  
> **Companion repositories**: [backend](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-backend) and [frontend](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-frontend).

This document gives contributors a practical map of how the dashboard is built. It avoids environment-specific secrets and does not replace the repository READMEs, which remain the setup entrypoints.

## System purpose

The dashboard supports dental practice operations around Open Dental:

- **Insurance verification writeback**: reads prepared verification data, executes configurable writeback steps, and updates Open Dental records.
- **Patient credit identification**: classifies and tracks patient credit records for operational review.
- **Extraction and reporting workflows**: coordinate scheduled extraction, Google Sheets handoff, Slack reporting, and operational status views.
- **Robot heartbeat monitoring**: tracks workstation heartbeat status for operational visibility.

## Repository map

| Repository | Responsibility | Primary runtime |
|---|---|---|
| [Backend](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-backend) | Flask API, workers, services, migrations, Open Dental/Google/Slack integrations. | Cloud Run / local Flask |
| [Frontend](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-frontend) | Vue 3 dashboard UI, Pinia stores, routes, admin/writeback/credit views. | Vite / Vercel |

## Runtime topology

```text
Browser
  ↓
Frontend, Vue 3 + Vuetify + Pinia
  ↓ HTTP JSON, JWT auth
Backend, Flask API
  ↓
PostgreSQL control plane
  ↓
Open Dental API, Google APIs, Slack APIs, Cloud Tasks, GCS
```

In local development, the recommended path is:

```text
PostgreSQL in Docker
Backend in Python virtualenv on http://localhost:5000
Frontend Vite dev server on http://localhost:5173
```

## Backend architecture

The backend follows an application-factory Flask layout:

```text
app/
  __init__.py          # create_app(), extension setup, route registration
  config.py            # environment-specific config and runtime flags
  routes/              # HTTP endpoints and blueprints
  schemas/             # request/response validation
  services/            # business logic and integration orchestration
  models/              # SQLAlchemy models
  integrations/        # Open Dental, Google, Slack, circuit breaker helpers
  engine/              # writeback pipeline context, dispatcher, step registry
  extraction/          # extraction schedules, intents, services, templates
  credit/              # credit domain models, routes, and services
  workers/             # background worker loops
migrations/            # Alembic migrations
tests/                 # pytest suite
```

### Backend request flow

```text
Route
  ↓ validate input
Schema
  ↓ call domain operation
Service
  ↓ read/write data
Model / Integration
  ↓ return response
Route response envelope
```

Important backend rules:

- Keep business logic in services, not route functions.
- Keep direct database session usage out of controllers/routes.
- Use schemas for API inputs and typed service boundaries for new code.
- Open Dental reads should go through ShortQuery-first gateway methods.
- Production-like config, secrets, deploy commands, and migrations need extra review.

## Writeback pipeline

The writeback engine is config-driven:

```text
WritebackJob
  ↓
Pipeline profile + step configuration
  ↓
PipelineContext
  ↓
StepRegistry resolves each step
  ↓
Dispatcher executes steps in order
  ↓
StepLog + WritebackExecution + artifact records
```

Pipeline steps update Open Dental plans, benefits, deductibles, frequencies, appointments, commlogs, documents, and verification dates. Steps should be small, deterministic, and safe to retry when possible.

## Data model overview

| Area | Main concepts |
|---|---|
| Tenancy | Client, clinic, product enrollment, credentials. |
| Auth/RBAC | Dashboard users, roles, permissions, product access. |
| Writeback | Jobs, executions, pipeline profiles, step logs, artifacts. |
| Configuration | Benefit mappings, frequency mappings, age limits, fee schedules, templates. |
| Extraction | Schedules, intents, runs, health events, template SQL. |
| Credit | Credit runs, chunks, records, exclusions, mirror/local read models. |
| Operations | Circuit breakers, drive watches, robot workstations, Slack reporting. |

## Frontend architecture

The frontend is a Vue 3 + Vuetify dashboard based on the Berry admin template:

```text
full-version/src/
  router/              # route definitions and auth guards
  stores/              # Pinia stores per domain
  views/               # page-level screens
  components/          # shared and feature components
  types/               # TypeScript domain types
  utils/helpers/       # fetch wrapper and shared helpers
  layouts/             # full and blank app layouts
  theme/               # Vuetify theme configuration
```

### Frontend data flow

```text
View component
  ↓ calls action
Pinia store
  ↓ uses fetch wrapper
Backend API
  ↓ response envelope
Store state
  ↓ reactive render
View component
```

Important frontend rules:

- Use Vue 3 Composition API and `<script setup>`.
- Use Pinia for state. Do not introduce Vuex.
- Keep UI consistent with Vuetify/Berry patterns.
- Never expose secrets through `VITE_` variables.
- API contract changes should reference the matching backend change.

## Authentication and authorization

The dashboard uses self-managed JWT authentication:

```text
Login
  ↓
Backend validates credentials
  ↓
Access token + refresh token
  ↓
Frontend stores auth state in Pinia
  ↓
Requests include Authorization: Bearer <token>
```

RBAC is enforced by backend roles and permissions. Frontend guards improve UX, but backend authorization is the source of truth.

## External integrations

| Integration | Purpose |
|---|---|
| Open Dental API | Dental record reads/writes, ShortQuery reads, document upload, appointments, benefits, plans. |
| Google APIs | Sheets/Drive workflows and document access. |
| Cloud Tasks | Durable background fan-out for writeback/extraction/credit work. |
| GCS | Artifact payload storage when enabled. |
| Slack APIs | Pull reporting and operational notifications. |
| Cloud Run | Backend and worker runtime. |

Local development should keep external write-heavy features disabled unless the developer has explicit credentials and a safe test clinic.

## Local development boundary

For local setup, start from each README:

- [Backend local setup](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-backend/-/blob/main/README.md?ref_type=heads#local-development-recommended)
- [Frontend local setup](./readme.md#local-development)

Expected local URLs:

| Service | URL |
|---|---|
| Backend API | `http://localhost:5000` |
| Frontend dev server | `http://localhost:5173` |
| PostgreSQL | `localhost:5432` |

## Change review checklist

Before merging changes, verify:

- [ ] The change is scoped to a clear unit of work.
- [ ] Backend changes have relevant tests or an explicit verification note.
- [ ] Frontend changes have typecheck/lint/test/build signal when applicable.
- [ ] No secrets, local env files, logs, dumps, or patient data are committed.
- [ ] API contract changes are reflected in both repositories when needed.
- [ ] Migrations, deploy config, auth/RBAC, and external integrations have risk notes.

## Related docs

- [Frontend README](./readme.md)
- [Frontend contribution guide](./CONTRIBUTING.md)
- [Backend README](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-backend/-/blob/main/README.md?ref_type=heads)
- [Backend contribution guide](https://gitlab.com/ralop-tech/rocketbot/dentalrobot-library/open-dental-dashboard-backend/-/blob/main/CONTRIBUTING.md?ref_type=heads)
