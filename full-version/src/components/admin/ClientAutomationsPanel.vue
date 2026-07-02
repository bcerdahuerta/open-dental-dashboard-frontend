<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useClientAutomationsStore } from '@/stores/clientAutomations';
import { RefreshIcon } from 'vue-tabler-icons';

const store = useClientAutomationsStore();
const { rules, runs, loading, error } = storeToRefs(store);
const { fetchRules, fetchRuns } = store;

const recentRuns = computed(() => runs.value.slice(0, 5));

function formatRuleType(value: string) {
  if (value === 'appointment_provider_reassignment') return 'Appointment Provider Reassignment';
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStatus(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatDiagnosticCategory(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part.toLowerCase()))
    .join(' ');
}

function statusColor(value: string) {
  if (value === 'COMPLETED') return 'success';
  if (value === 'FAILED_FINAL' || value === 'PARTIAL_FAILED') return 'error';
  if (value === 'RETRY_WAIT' || value === 'RUNNING') return 'warning';
  return 'secondary';
}

async function refreshSummaries() {
  try {
    await Promise.all([fetchRules(), fetchRuns({ limit: 10 })]);
  } catch {
    // Store state owns the PHI-safe user-facing error message.
  }
}

onMounted(() => {
  refreshSummaries();
});
</script>

<template>
  <UiParentCard title="Client Automations">
    <template v-slot:action>
      <v-btn color="primary" variant="tonal" size="small" :loading="loading" @click="refreshSummaries">
        <RefreshIcon size="16" stroke-width="1.5" class="mr-1" />
        Refresh
      </v-btn>
    </template>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      Unable to load automation summaries.
    </v-alert>

    <v-row>
      <v-col cols="12" md="5">
        <div class="text-subtitle-1 font-weight-medium mb-3">Rules</div>
        <v-alert v-if="!loading && rules.length === 0" type="info" variant="tonal">
          No automations configured.
        </v-alert>
        <v-list v-else lines="three" class="border rounded-md">
          <v-list-item v-for="rule in rules" :key="rule.id">
            <template v-slot:title>
              <div class="d-flex align-center justify-space-between ga-3">
                <span>{{ formatRuleType(rule.rule_type) }}</span>
                <v-chip :color="rule.enabled ? 'success' : 'secondary'" :class="rule.enabled ? 'bg-lightsuccess' : 'bg-lightsecondary'" size="small">
                  {{ rule.enabled ? 'Enabled' : 'Disabled' }}
                </v-chip>
              </div>
            </template>
            <template v-slot:subtitle>
              <div class="mt-2 text-medium-emphasis">
                <div>{{ rule.config.source_provider_abbr || 'Source' }} → {{ rule.config.target_provider_abbr || 'Target' }}</div>
                <div>{{ rule.schedule_time }} {{ rule.timezone }}</div>
                <div v-if="rule.internal_owner">Owner: {{ rule.internal_owner }}</div>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-col>

      <v-col cols="12" md="7">
        <div class="text-subtitle-1 font-weight-medium mb-3">Recent Runs</div>
        <v-alert v-if="!loading && recentRuns.length === 0" type="info" variant="tonal">
          No recent automation runs.
        </v-alert>
        <v-list v-else lines="three" class="border rounded-md">
          <v-list-item v-for="run in recentRuns" :key="run.id">
            <template v-slot:title>
              <div class="d-flex align-center justify-space-between ga-3">
                <span>Target {{ run.target_service_date }}</span>
                <v-chip :color="statusColor(run.status)" size="small">
                  {{ formatStatus(run.status) }}
                </v-chip>
              </div>
            </template>
            <template v-slot:subtitle>
              <div class="mt-2 d-flex flex-wrap ga-2 text-medium-emphasis">
                <span>Matched {{ run.matched_count }}</span>
                <span>Changed {{ run.changed_count }}</span>
                <span>Skipped {{ run.skipped_count }}</span>
                <span>Failed {{ run.failed_count }}</span>
                <span>Retries {{ run.retry_attempts }}/{{ run.max_attempts }}</span>
              </div>
              <v-alert v-if="run.error_category && run.error_code" type="warning" variant="tonal" density="compact" class="mt-3 mb-0">
                <div class="font-weight-medium">{{ formatDiagnosticCategory(run.error_category) }}</div>
                <div>{{ run.error_code }}</div>
                <div v-if="run.error_summary">{{ run.error_summary }}</div>
              </v-alert>
            </template>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>
  </UiParentCard>
</template>
