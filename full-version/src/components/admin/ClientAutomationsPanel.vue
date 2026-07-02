<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useClientAutomationsStore } from '@/stores/clientAutomations';
import type { ClientAutomationRuleSummary } from '@/types/clientAutomations';
import { PlayerPlayIcon, RefreshIcon } from 'vue-tabler-icons';

const store = useClientAutomationsStore();
const { rules, runs, health, loading, error } = storeToRefs(store);
const { createManualRun, fetchHealth, fetchRules, fetchRuns, updateRuleEnabled } = store;
const manualTargetDates = reactive<Record<string, string>>({});
const manualRunMessage = ref<string | null>(null);

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

function scheduleStatusColor(value: string) {
  if (value === 'ready') return 'success';
  if (value === 'disabled') return 'secondary';
  if (value === 'unsupported_scope' || value === 'misconfigured') return 'warning';
  return 'secondary';
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatNullable(value: string | null, fallback = 'None') {
  return value || fallback;
}

function ensureManualDates() {
  for (const rule of rules.value) {
    if (!manualTargetDates[rule.id]) {
      manualTargetDates[rule.id] = rule.next_target_service_date || '';
    }
  }
}

function setManualTargetDate(ruleId: string, value: unknown) {
  manualTargetDates[ruleId] = typeof value === 'string' ? value : '';
}

async function toggleRule(rule: ClientAutomationRuleSummary, enabled: boolean) {
  manualRunMessage.value = null;
  try {
    await updateRuleEnabled(rule.id, enabled);
    await fetchHealth();
  } catch {
    // Store state owns the PHI-safe user-facing error message.
  }
}

async function runNow(rule: ClientAutomationRuleSummary) {
  const targetDate = manualTargetDates[rule.id] || rule.next_target_service_date;
  if (!targetDate) {
    manualRunMessage.value = 'Select a target service date before running this automation.';
    return;
  }
  try {
    const result = await createManualRun(rule.id, { target_service_date: targetDate });
    if (result.dispatch_status.dispatched) {
      manualRunMessage.value = 'Manual run queued for Cloud Tasks execution.';
    } else if (result.dispatch_status.status === 'already_queued') {
      manualRunMessage.value = 'Manual run is already queued for Cloud Tasks execution.';
    } else {
      manualRunMessage.value = `Manual run created, but not queued: ${formatStatus(result.dispatch_status.status)}.`;
    }
    await Promise.all([fetchHealth(), fetchRules(), fetchRuns({ limit: 10 })]);
    ensureManualDates();
  } catch {
    // Store state owns the PHI-safe user-facing error message.
  }
}

async function refreshSummaries() {
  try {
    await Promise.all([fetchHealth(), fetchRules(), fetchRuns({ limit: 10 })]);
    ensureManualDates();
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
      {{ error }}
    </v-alert>

    <v-alert v-if="manualRunMessage" type="info" variant="tonal" class="mb-4">
      {{ manualRunMessage }}
    </v-alert>

    <v-row v-if="health" class="mb-2">
      <v-col cols="12" md="3">
        <v-sheet rounded="md" border class="pa-3 h-100">
          <div class="text-caption text-medium-emphasis">Backend dispatch</div>
          <v-chip
            :color="health.use_cloud_tasks && health.service_url_configured && health.service_account_configured ? 'success' : 'warning'"
            size="small"
            class="mt-2"
          >
            {{ health.use_cloud_tasks && health.service_url_configured && health.service_account_configured ? 'Configured' : 'Needs configuration' }}
          </v-chip>
        </v-sheet>
      </v-col>
      <v-col cols="12" md="3">
        <v-sheet rounded="md" border class="pa-3 h-100">
          <div class="text-caption text-medium-emphasis">Enabled rules</div>
          <div class="text-h6">{{ health.enabled_rules_count }}</div>
        </v-sheet>
      </v-col>
      <v-col cols="12" md="3">
        <v-sheet rounded="md" border class="pa-3 h-100">
          <div class="text-caption text-medium-emphasis">Clinic scoped</div>
          <div class="text-h6">{{ health.clinic_scoped_rules_count }}</div>
        </v-sheet>
      </v-col>
      <v-col cols="12" md="3">
        <v-sheet rounded="md" border class="pa-3 h-100">
          <div class="text-caption text-medium-emphasis">Dispatch limit</div>
          <div class="text-h6">{{ health.max_dispatch_per_sweep }}</div>
          <div class="text-caption text-medium-emphasis">Queue {{ health.queue_name || 'not set' }}</div>
        </v-sheet>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <div class="text-subtitle-1 font-weight-medium mb-3">Rules</div>
        <v-alert v-if="!loading && rules.length === 0" type="info" variant="tonal">
          No automations configured. Seed or configure clinic-scoped automation rules before expecting scheduled runs.
        </v-alert>
        <v-list v-else lines="three" class="border rounded-md">
          <v-list-item v-for="rule in rules" :key="rule.id">
            <template v-slot:title>
              <div class="d-flex align-center justify-space-between ga-3">
                <span>{{ formatRuleType(rule.rule_type) }}</span>
                <v-chip :color="scheduleStatusColor(rule.schedule_status)" size="small">
                  {{ formatStatus(rule.schedule_status) }}
                </v-chip>
              </div>
            </template>
            <template v-slot:subtitle>
              <div class="mt-2 text-medium-emphasis">
                <div>{{ rule.config.source_provider_abbr || 'Source' }} → {{ rule.config.target_provider_abbr || 'Target' }}</div>
                <div>{{ rule.schedule_time }} {{ rule.timezone }}</div>
                <div>Next execution: {{ formatDateTime(rule.next_scheduled_execution_at) }}</div>
                <div>Next target date: {{ formatNullable(rule.next_target_service_date, 'Not available') }}</div>
                <div>Last run: {{ formatNullable(rule.last_run_status, 'No runs') }} {{ rule.last_run_target_service_date || '' }}</div>
                <div v-if="rule.internal_owner">Owner: {{ rule.internal_owner }}</div>
              </div>
              <v-row class="mt-3" align="center">
                <v-col cols="12" sm="4">
                  <v-switch
                    :model-value="rule.enabled"
                    color="primary"
                    hide-details
                    density="compact"
                    :label="rule.enabled ? 'Enabled' : 'Paused'"
                    :disabled="loading"
                    @update:model-value="toggleRule(rule, Boolean($event))"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    :model-value="manualTargetDates[rule.id] || rule.next_target_service_date || ''"
                    type="date"
                    label="Target service date"
                    variant="outlined"
                    color="primary"
                    hide-details="auto"
                    density="compact"
                    @update:model-value="setManualTargetDate(rule.id, $event)"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-btn color="primary" variant="outlined" size="small" :loading="loading" @click="runNow(rule)">
                    <PlayerPlayIcon size="16" stroke-width="1.5" class="mr-1" />
                    Run now
                  </v-btn>
                </v-col>
              </v-row>
            </template>
          </v-list-item>
        </v-list>
      </v-col>

      <v-col cols="12" md="6">
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
