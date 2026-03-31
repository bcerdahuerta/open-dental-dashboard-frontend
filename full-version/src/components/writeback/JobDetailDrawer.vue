<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { storeToRefs } from 'pinia';
import {
  CircleCheckIcon,
  XIcon,
  CircleDotIcon,
  RefreshIcon,
  ClockIcon,
  DatabaseIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleXIcon,
} from 'vue-tabler-icons';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useWritebackStore } from '@/stores/writeback';
import type { WritebackJobDetail } from '@/types/writeback';

const props = defineProps<{
  modelValue: boolean;
  jobId: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const writebackStore = useWritebackStore();
const { selectedJob, loading, compensationEntries } = storeToRefs(writebackStore);

const expandedSteps = ref<Set<number>>(new Set());

function toggleStepOutput(index: number) {
  const next = new Set(expandedSteps.value);
  if (next.has(index)) {
    next.delete(index);
  } else {
    next.add(index);
  }
  expandedSteps.value = next;
}

const drawerOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// Fetch job detail when jobId changes
watch(
  () => props.jobId,
  (id) => {
    if (id) {
      writebackStore.fetchJobDetail(id);
    }
  },
  { immediate: true }
);

// Fetch compensation entries when execution is available
watch(
  () => selectedJob.value?.execution?.id,
  (executionId) => {
    if (executionId) {
      writebackStore.fetchCompensationEntries(executionId);
    }
  },
  { immediate: true }
);

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'warning',
    POLLING: 'primary',
    EXTRACTING: 'primary',
    EXECUTING: 'primary',
    DONE: 'success',
    FAILED: 'error',
    SUCCESS: 'success',
    SKIPPED: 'grey',
    RECORDED: 'info',
    REVERSED: 'warning',
    // v2 statuses
    EXTRACTED: 'info',
    EXECUTED: 'info',
    PARTIAL: 'orange',
    SYNCING: 'primary',
    SYNCED: 'success',
    EXTRACT_FAILED: 'error',
    SYNC_FAILED: 'error',
  };
  return colors[status] || 'grey';
}

function stepIcon(status: string) {
  if (status === 'SUCCESS') return CircleCheckIcon;
  if (status === 'FAILED') return XIcon;
  return CircleDotIcon;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function handleRetry() {
  if (selectedJob.value) {
    await writebackStore.retryJob(selectedJob.value.id);
    if (selectedJob.value) {
      await writebackStore.fetchJobDetail(selectedJob.value.id);
    }
  }
}
</script>

<template>
  <v-navigation-drawer v-model="drawerOpen" location="right" temporary width="480">
    <template v-if="loading">
      <div class="d-flex align-center justify-center" style="height: 100%">
        <v-progress-circular indeterminate color="primary" />
      </div>
    </template>

    <template v-else-if="selectedJob">
      <!-- Header -->
      <v-toolbar flat color="transparent">
        <v-toolbar-title class="text-h6">
          {{ selectedJob.patient_name || 'Unknown Patient' }}
        </v-toolbar-title>
        <v-spacer />
        <v-chip :color="statusColor(selectedJob.status)" variant="tonal" size="small" class="mr-2">
          {{ selectedJob.status }}
        </v-chip>
        <v-btn icon variant="text" size="small" @click="drawerOpen = false">
          <XIcon size="20" />
        </v-btn>
      </v-toolbar>

      <v-divider />

      <div class="pa-4">
        <!-- Section 1: Job Info -->
        <UiParentCard title="Job Information">
          <v-list density="compact" class="pa-0">
            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">Job ID</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium">
                {{ selectedJob.id }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">Row Index</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium">
                {{ selectedJob.row_index }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">Attempt</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium">
                {{ selectedJob.attempt }} / {{ selectedJob.max_attempts }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">Created</v-list-item-title>
              <v-list-item-subtitle class="text-body-2">
                {{ formatDate(selectedJob.created_at) }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedJob.started_at">
              <v-list-item-title class="text-caption text-medium-emphasis">Started</v-list-item-title>
              <v-list-item-subtitle class="text-body-2">
                {{ formatDate(selectedJob.started_at) }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedJob.completed_at">
              <v-list-item-title class="text-caption text-medium-emphasis">Completed</v-list-item-title>
              <v-list-item-subtitle class="text-body-2">
                {{ formatDate(selectedJob.completed_at) }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <!-- Error message -->
          <v-alert
            v-if="selectedJob.error_message"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ selectedJob.error_message }}
          </v-alert>

          <v-alert
            v-if="selectedJob.error_category === 'source_file_invalid'"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            Source file issue detected. Fix/regenerate the short form file first, then retry this job.
          </v-alert>
        </UiParentCard>

        <!-- Section 2: Execution Steps -->
        <UiParentCard
          v-if="selectedJob.execution"
          title="Execution Steps"
          class="mt-4"
        >
          <v-timeline density="compact" side="end" class="pa-0">
            <v-timeline-item
              v-for="(step, index) in selectedJob.execution.step_logs"
              :key="index"
              :dot-color="statusColor(step.status)"
              size="x-small"
            >
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-2">
                  <component
                    :is="stepIcon(step.status)"
                    :size="16"
                    :class="`text-${statusColor(step.status)}`"
                  />
                  <span class="text-body-2 font-weight-medium">{{ step.step_type }}</span>
                </div>
                <div class="d-flex align-center ga-1">
                  <v-chip
                    :color="statusColor(step.status)"
                    variant="tonal"
                    size="x-small"
                  >
                    {{ formatDuration(step.duration_ms) }}
                  </v-chip>
                  <v-btn
                    v-if="step.output"
                    icon
                    variant="text"
                    size="x-small"
                    @click="toggleStepOutput(index)"
                  >
                    <component
                      :is="expandedSteps.has(index) ? ChevronUpIcon : ChevronDownIcon"
                      :size="14"
                      class="text-medium-emphasis"
                    />
                  </v-btn>
                </div>
              </div>
              <!-- Step output evidence -->
              <v-card
                v-if="step.output && expandedSteps.has(index)"
                variant="outlined"
                class="mt-2 pa-3 rounded-lg bg-lightsecondary"
              >
                <v-row
                  v-for="(val, key) in step.output"
                  :key="String(key)"
                  no-gutters
                  class="py-1"
                >
                  <v-col cols="5" class="text-caption text-medium-emphasis">
                    {{ key }}
                  </v-col>
                  <v-col cols="7" class="text-caption font-weight-medium">
                    <CircleCheckIcon v-if="val === true" :size="14" class="text-success" />
                    <CircleXIcon v-else-if="val === false" :size="14" class="text-error" />
                    <template v-else>{{ val }}</template>
                  </v-col>
                </v-row>
              </v-card>
              <!-- Failed step error -->
              <v-alert
                v-if="step.status === 'FAILED' && step.error_message"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-2 text-caption"
              >
                {{ step.error_message }}
              </v-alert>
            </v-timeline-item>
          </v-timeline>
        </UiParentCard>

        <!-- Section 3: Compensation Log -->
        <UiParentCard
          v-if="compensationEntries && compensationEntries.length > 0"
          title="Compensation Log"
          class="mt-4"
        >
          <template #action>
            <v-chip color="info" variant="tonal" size="x-small" class="mr-2">
              {{ compensationEntries.length }} entries
            </v-chip>
          </template>

          <v-expansion-panels variant="accordion" class="mt-2">
            <v-expansion-panel
              v-for="entry in compensationEntries"
              :key="entry.id"
            >
              <v-expansion-panel-title class="py-2">
                <div class="d-flex align-center ga-2 flex-grow-1">
                  <DatabaseIcon size="16" class="text-primary" />
                  <span class="text-body-2 font-weight-medium">{{ entry.step_type }}</span>
                  <v-chip
                    :color="entry.resource_type === 'benefit' ? 'primary' : 'secondary'"
                    variant="tonal"
                    size="x-small"
                  >
                    {{ entry.resource_type }}:{{ entry.resource_id }}
                  </v-chip>
                  <v-spacer />
                  <v-chip
                    :color="statusColor(entry.status)"
                    variant="tonal"
                    size="x-small"
                  >
                    {{ entry.status }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="text-caption text-medium-emphasis mb-1">Before State</div>
                <pre class="bg-grey-lighten-4 pa-2 rounded text-caption mb-2" style="overflow-x: auto; max-height: 150px">{{ JSON.stringify(entry.before_state, null, 2) || '{}' }}</pre>
                <div class="text-caption text-medium-emphasis mb-1">After State</div>
                <pre class="bg-grey-lighten-4 pa-2 rounded text-caption" style="overflow-x: auto; max-height: 150px">{{ JSON.stringify(entry.after_state, null, 2) || 'null' }}</pre>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </UiParentCard>

        <!-- Footer: Retry button -->
        <div v-if="selectedJob.status === 'FAILED' || selectedJob.status === 'PARTIAL'" class="mt-4">
          <v-btn color="warning" variant="flat" block @click="handleRetry">
            <RefreshIcon size="18" class="mr-2" />
            Retry Job
          </v-btn>
        </div>
      </div>
    </template>
  </v-navigation-drawer>
</template>
