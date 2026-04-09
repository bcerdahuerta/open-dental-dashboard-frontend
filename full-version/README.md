# Open Dental Automation Dashboard — Frontend

> **Version**: 1.2 — 2026-04-09
> **Framework**: Vue 3.5 + Vuetify 3.9 (Berry admin template)
> **Deploy**: Vercel (auto-deploy on push to `main`)

Dashboard frontend for managing Open Dental insurance verification writebacks, patient credit identification, and appointment extraction automation.

## Features

- **Operations Hub** — Real-time pipeline monitoring, job queue management
- **Writeback Module** — Live activity feed, job detail inspection, profile resolution
- **Credit Module** — Patient credit dashboard, run history, record management with aging analytics
- **Extraction Module** — Auto-extraction dashboard, run history, per-clinic schedule config, encargado (workforce) management
- **Admin** — Client/clinic CRUD, pipeline config, template management, user approval, system logs
- **RBAC** — Role-based views (admin, operator, qa_lead, viewer)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Vue 3.5 + Composition API (`<script setup>`) |
| UI Library | Vuetify 3.9 (Berry template) |
| State | Pinia 3 (NOT Vuex — hard constraint) |
| Build | Vite 7 + vue-tsc + TypeScript 5.9 |
| HTTP | axios + fetchWrapper (JWT auto-refresh) |
| Icons | vue-tabler-icons |
| Router | Vue Router 4 |
| i18n | vue-i18n 11 |
| Forms | vee-validate + yup |
| Lint/Format | ESLint 9 + Prettier 3 + husky + lint-staged |

---

## Quick Start

```bash
# Install dependencies
cd full-version
npm install

# Configure environment
cp .env.example .env.local
# Set VITE_API_URL to your backend URL

# Development server
npm run dev

# Type check
npx vue-tsc --noEmit

# Production build
npm run build
```

---

## Project Structure

```
full-version/src/
├── types/                     # TypeScript interfaces
│   ├── credit.ts              # Credit module types
│   ├── extraction.ts          # Extraction module types
│   └── ...
│
├── stores/                    # Pinia stores (Composition API)
│   ├── auth.ts                # Authentication + JWT management
│   ├── clients.ts             # Client CRUD
│   ├── clinics.ts             # Clinic CRUD
│   ├── credit.ts              # Credit module state
│   ├── extraction.ts          # Extraction module state
│   ├── writeback.ts           # Writeback pipeline state
│   └── customizer.ts          # Theme/UI preferences
│
├── views/                     # Page components
│   ├── dashboards/
│   │   └── default/
│   │       └── DefaultDashboard.vue  # Operations hub
│   ├── writeback/
│   │   ├── LiveActivity.vue    # Real-time pipeline feed
│   │   └── JobQueue.vue        # Job management
│   ├── credit/
│   │   ├── CreditDashboard.vue # KPI cards + charts
│   │   ├── CreditRecords.vue   # Patient credit records
│   │   ├── CreditRecordDetail.vue
│   │   └── CreditRuns.vue      # Run history
│   ├── extraction/
│   │   ├── ExtractionDashboard.vue  # KPI + manual trigger
│   │   ├── ExtractionRuns.vue       # Paginated run history
│   │   ├── ExtractionSchedules.vue  # Per-clinic schedule config
│   │   └── EncargadoList.vue        # Workforce CRUD + analytics
│   ├── admin/
│   │   ├── ClientList.vue
│   │   ├── ClinicList.vue
│   │   ├── ClinicDetail.vue
│   │   ├── PipelineList.vue
│   │   ├── ProfileResolution.vue
│   │   ├── TemplateList.vue
│   │   ├── UserApproval.vue
│   │   └── SystemLogs.vue
│   ├── authentication/
│   └── profile/
│
├── router/
│   ├── MainRoutes.ts          # Authenticated routes
│   └── PublicRoutes.ts        # Login/register
│
├── components/shared/
│   ├── UiParentCard.vue       # Main content container
│   ├── BaseBreadcrumb.vue     # Breadcrumb navigator
│   └── ...
│
└── utils/helpers/
    └── fetch-wrapper.ts       # JWT-aware HTTP client
```

---

## Architecture Patterns

### Store Pattern (Pinia Composition API)

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';

const baseUrl = `${import.meta.env.VITE_API_URL}/resource`;

export const useMyStore = defineStore('myStore', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const items = ref<Item[]>([]);

  async function fetchItems() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await fetchWrapper.get(baseUrl);
    } catch (err: any) {
      error.value = err?.message || String(err);
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, items, fetchItems };
});
```

### Page Pattern

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useMyStore } from '@/stores/myStore';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';

const store = useMyStore();
const { items, loading, error } = storeToRefs(store);

const page = ref({ title: 'My Page' });
const breadcrumbs = ref([
  { title: 'Home', disabled: false, href: '/dashboard/default' },
  { title: 'My Page', disabled: true, href: '#' }
]);

onMounted(() => store.fetchItems());
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Content">
        <v-data-table :items="items" :loading="loading" />
      </UiParentCard>
    </v-col>
  </v-row>
</template>
```

### Hard Constraints

- **Forbidden:** Options API (`data()`, `methods()`)
- **Forbidden:** Vuex (must use Pinia)
- **Forbidden:** Custom CSS/SCSS (must use Vuetify utility classes)
- **Mandatory:** `UiParentCard` or `MainCard` for containers
- **Mandatory:** Composition API with `<script setup lang="ts">`

---

## Routes & Product Guards

Routes are protected by product access:

| Product | Pages |
|---------|-------|
| `writeback` | Operations Hub, Live Activity, Job Queue, Admin pages |
| `credit` | Credit Dashboard, Records, Run History |
| `extraction` | Extraction Dashboard, Runs, Schedules, Encargados |

Route guard checks `auth.hasProduct('product_name')` before allowing access.

---

## Deployment

Vercel auto-deploys when you push to `main`:

```bash
cd open-dental-dashboard-frontend
git add .
git commit -m "feat(module): description"
git push origin main
```

No manual build step — Vercel handles build + CDN.

---

## Testing

```bash
npm run test          # Run tests
npm run lint          # Lint check
npx vue-tsc --noEmit  # Type check
```
