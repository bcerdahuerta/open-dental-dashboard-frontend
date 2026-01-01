# Changelog - Dentalrobot Operations Monitor

All notable changes to the Open Dental Automation Dashboard project will be documented in this file.

## [2025-12-31] - Sidebar & Router Refactor (Phase 2.2)

### Added

- **Placeholder Views**: Created 6 new view files to support the refactored navigation:
  - `src/views/operations/LiveActivity.vue` - Integrates the existing `LiveActivityFeed` component
  - `src/views/operations/PatientSearch.vue` - Coming Soon placeholder
  - `src/views/analytics/Reports.vue` - Coming Soon placeholder
  - `src/views/admin/ClientList.vue` - Coming Soon placeholder
  - `src/views/admin/BotOperations.vue` - Coming Soon placeholder
  - `src/views/admin/SystemLogs.vue` - Coming Soon placeholder

### Changed

- **Menu Configuration**: `sidebarItem.ts` completely refactored (1001 → 62 lines)
  - Removed all Berry template menu items (Widgets, Forms, UI Elements, Apps, Pages, Utilities, etc.)
  - Implemented new Dentalrobot-specific navigation structure:
    - **Overview**: Operations Hub
    - **Live Stream**: Live Activity, Patient Search
    - **Analytics**: Reports
    - **Administration**: Client Management, Bot Operations, System Logs
  - Updated icon imports to use semantic Tabler icons (`ActivityIcon`, `SearchIcon`, `ChartBarIcon`, `BuildingArchIcon`, `RobotIcon`, `ClipboardListIcon`)

- **Router Configuration**: `MainRoutes.ts` streamlined (468 → 53 lines)
  - Removed ~100+ template routes (widgets, forms, UI elements, apps, utilities, etc.)
  - Retained core dashboard routes (`/dashboard/default`, `/dashboard/analytics`)
  - Added 6 new Dentalrobot routes:
    - `/operations/live-activity` → LiveActivity
    - `/operations/patient-search` → PatientSearch
    - `/analytics/reports` → Reports
    - `/admin/clients` → ClientManagement
    - `/admin/bot-ops` → BotOperations
    - `/admin/logs` → SystemLogs

- **Footer Branding**: `FooterPanel.vue` updated
  - Replaced Berry/CodedThemes branding with "© 2025 Dentalrobot. All rights reserved."
  - Removed external links (Home, Documentation, Support)

### Technical Notes

- **Interface Simplification**: Reduced `menu` interface to essential properties (`header`, `title`, `icon`, `to`, `children`)
- **Component Reuse**: `LiveActivity.vue` view leverages existing `LiveActivityFeed.vue` component
- **Consistency**: All placeholder views follow the established pattern with `BaseBreadcrumb` and `UiParentCard`

---

## [2025-12-31] - Dashboard UI Scaffold (Phase 2.1)

### Added

- **New Directory**: `src/components/dashboards/dental/` for domain-specific dashboard components.
- **Component**: `LiveActivityFeed.vue` - A native Vuetify `v-data-table` displaying 6 mock verification entries. Includes columns for Patient (Name + DOB), Carrier, Verification Type (FBD/ELG/Short), and Status (Extracted/QA Done/Written Back).
- **Component**: `VerificationMixChart.vue` - An ApexCharts bar chart component showing the distribution of "Full Breakdown" vs "Eligibility" checks over the last 7 days.
- **Mock Data Layer**: Hardcoded realistic domain data inside `<script setup>` to simulate production output before Backend integration.

### Changed

- **View**: `DefaultDashboard.vue` - Completely transformed from the default e-commerce template into the Dentalrobot Operations Monitor.
  - Implemented 4 KPI Stat Cards:
    1. **Daily Volume**: 124 (Verifications Today)
    2. **QA Pending**: 18 (Waiting for QA) - Amber
    3. **Writeback Queue**: 5 (Ready for Open Dental) - Secondary/Purple
    4. **Critical Errors**: 3 (Not Found / Failed) - Red
- **Refactoring**: Standardized icon usage using `vue-tabler-icons` (e.g., fixed `CircleCheckIcon` naming).

### Technical Notes

- **Styling**: Adhered to `tech_stack.md` using Vuetify utility classes and internal theme variables (e.g., `bg-lightprimary`, `text-primary`).
- **Dependencies**: Utilized `apexcharts` and native `v-data-table` for consistency with the Berry Vue Admin template.
