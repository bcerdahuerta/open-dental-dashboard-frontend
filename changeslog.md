# Changelog - Dentalrobot Operations Monitor

All notable changes to the Open Dental Automation Dashboard project will be documented in this file.

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
