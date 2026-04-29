import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchWrapper } from '@/utils/helpers/fetch-wrapper';
import { useClinicStore } from '@/stores/clinics';
import { useClientStore } from '@/stores/clients';
import type {
  AssignClinicsResponse,
  AssignClinicsRequest,
  AssignClientsRequest,
  Encargado,
  EncargadoAssignmentChange,
  EncargadoAnalytics,
  EncargadoAnalyticsMetrics,
  EncargadoAnalyticsStatus,
  EncargadoCapacity,
  EncargadoClinicOwnership,
  EncargadoWorkloadSummary,
  ExtractionManualTriggerRequest,
  ExtractionManualTriggerResponse,
  ExtractionHealth,
  ExtractionNotificationStatus,
  ExtractionOperationEvent,
  ExtractionEffectivePolicy,
  ExtractionRolloutCheck,
  ExtractionRun,
  ExtractionRunFilters,
  ExtractionSchedule,
  Pagination,
  RunsResponse,
  WorkforceDrawerMode,
  InsuranceEnrichmentConfigPayload,
  InsuranceEnrichmentConfigShape,
  InsuranceEnrichmentClinicConfigRow,
  InsuranceEnrichmentPreviewResult,
} from '@/types/extraction';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

const baseUrl = `${import.meta.env.VITE_API_URL}/extractions`;
const apiUrl = `${import.meta.env.VITE_API_URL}`;

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeClinicOwnership(value: unknown): EncargadoClinicOwnership[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item): EncargadoClinicOwnership => ({
      clinic_id: typeof item.clinic_id === 'string' ? item.clinic_id : '',
      clinic_name: typeof item.clinic_name === 'string' ? item.clinic_name : '',
      client_id: typeof item.client_id === 'string' ? item.client_id : '',
      client_name: typeof item.client_name === 'string' ? item.client_name : '',
      assignment_source: item.assignment_source === 'client' ? 'client' : 'clinic'
    }))
    .filter((item) => item.clinic_id.length > 0);
}

function normalizeWorkloadSummary(value: unknown, member: Pick<Encargado, 'resolved_assignment_client_ids' | 'resolved_assignment_clinic_ids' | 'clinic_ids' | 'client_ids'>): EncargadoWorkloadSummary {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    resolved_client_count: typeof payload.resolved_client_count === 'number' ? payload.resolved_client_count : member.resolved_assignment_client_ids?.length ?? 0,
    resolved_clinic_count: typeof payload.resolved_clinic_count === 'number' ? payload.resolved_clinic_count : member.resolved_assignment_clinic_ids?.length ?? 0,
    direct_clinic_count: typeof payload.direct_clinic_count === 'number' ? payload.direct_clinic_count : member.clinic_ids.length,
    legacy_client_count: typeof payload.legacy_client_count === 'number' ? payload.legacy_client_count : member.client_ids.length
  };
}

function normalizeCapacity(value: unknown, clinicIds: string[]): EncargadoCapacity {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    status: typeof payload.status === 'string' ? payload.status as EncargadoCapacity['status'] : 'unavailable',
    max_clinics: typeof payload.max_clinics === 'number' ? payload.max_clinics : null,
    assigned_clinic_count: typeof payload.assigned_clinic_count === 'number' ? payload.assigned_clinic_count : clinicIds.length,
    available_clinic_slots: typeof payload.available_clinic_slots === 'number' ? payload.available_clinic_slots : null,
    utilization_ratio: typeof payload.utilization_ratio === 'number' ? payload.utilization_ratio : null
  };
}

function normalizeAnalyticsStatus(value: unknown): EncargadoAnalyticsStatus {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    state: typeof payload.state === 'string' ? payload.state as EncargadoAnalyticsStatus['state'] : 'pending',
    missing_metrics: normalizeStringArray(payload.missing_metrics),
    updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : null
  };
}

function normalizeNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number')
    : [];
}

function normalizeInsuranceFields(value: unknown): InsuranceEnrichmentConfigShape['fields_applied'] {
  const payload = isRecord(value) ? value : {};
  return {
    carrier_name: Boolean(payload.carrier_name ?? true),
    member_id: Boolean(payload.member_id ?? true),
    subscriber_fname: Boolean(payload.subscriber_fname ?? true),
    subscriber_lname: Boolean(payload.subscriber_lname ?? true),
    subscriber_dob: Boolean(payload.subscriber_dob ?? true),
    subscriber_zip: Boolean(payload.subscriber_zip ?? true),
    relationship: Boolean(payload.relationship ?? true),
    subscriber_patnum: Boolean(payload.subscriber_patnum ?? true),
    group_number: Boolean(payload.group_number ?? true),
    group_name: Boolean(payload.group_name ?? true),
    verification_type: Boolean(payload.verification_type ?? true),
    file_name: Boolean(payload.file_name ?? true),
  };
}

function normalizeInsuranceConfigShape(value: unknown): InsuranceEnrichmentConfigShape {
  const payload = isRecord(value) ? value : {};
  const documentFileNamingPayload = isRecord(payload.document_file_naming) ? payload.document_file_naming : {};
  const documentFileNamingEffectiveSource = documentFileNamingPayload.effective_source === 'clinic_override' ? 'clinic_override' : 'client_config';
  return {
    enabled: Boolean(payload.enabled ?? false),
    application_mode: payload.application_mode === 'apply' ? 'apply' : 'preview',
    gemini_enabled: Boolean(payload.gemini_enabled ?? false),
    gemini_model: typeof payload.gemini_model === 'string' ? payload.gemini_model : 'gemini-3.1-flash-lite-preview',
    gemini_only_when_parser_incomplete: Boolean(payload.gemini_only_when_parser_incomplete ?? true),
    max_gemini_calls_per_run: typeof payload.max_gemini_calls_per_run === 'number' ? payload.max_gemini_calls_per_run : 25,
    apply_only_when_carrier_generic: Boolean(payload.apply_only_when_carrier_generic ?? true),
    set_verification_type_on_enrichment: Boolean(payload.set_verification_type_on_enrichment ?? true),
    verification_type_value: typeof payload.verification_type_value === 'string' ? payload.verification_type_value : 'FBD',
    update_filenames: Boolean(payload.update_filenames ?? true),
    fields_applied: normalizeInsuranceFields(payload.fields_applied),
    document_file_naming: {
      form_with_print: Boolean(documentFileNamingPayload.form_with_print ?? true),
      short_form: Boolean(documentFileNamingPayload.short_form ?? false),
      effective_source: documentFileNamingEffectiveSource,
    },
  };
}

function normalizeInsuranceClinicRow(value: unknown): InsuranceEnrichmentClinicConfigRow {
  const payload = isRecord(value) ? value : {};
  const inheritanceRaw = isRecord(payload.inheritance) ? payload.inheritance : {};
  return {
    clinic_id: typeof payload.clinic_id === 'string' ? payload.clinic_id : '',
    clinic_name: typeof payload.clinic_name === 'string' ? payload.clinic_name : '',
    has_override: Boolean(payload.has_override ?? false),
    effective_status: payload.effective_status === 'enabled' ? 'enabled' : 'disabled',
    effective_config: normalizeInsuranceConfigShape(payload.effective_config),
    clinic_override: isRecord(payload.clinic_override)
      ? {
          id: typeof payload.clinic_override.id === 'string' ? payload.clinic_override.id : '',
          clinic_id: typeof payload.clinic_override.clinic_id === 'string' ? payload.clinic_override.clinic_id : '',
          enabled: payload.clinic_override.enabled === null ? null : Boolean(payload.clinic_override.enabled),
          application_mode: payload.clinic_override.application_mode === 'apply' ? 'apply' : payload.clinic_override.application_mode === 'preview' ? 'preview' : null,
          gemini_enabled: payload.clinic_override.gemini_enabled === null ? null : Boolean(payload.clinic_override.gemini_enabled),
          gemini_model: typeof payload.clinic_override.gemini_model === 'string' ? payload.clinic_override.gemini_model : 'gemini-3.1-flash-lite-preview',
          gemini_only_when_parser_incomplete: payload.clinic_override.gemini_only_when_parser_incomplete === null ? null : Boolean(payload.clinic_override.gemini_only_when_parser_incomplete),
          max_gemini_calls_per_run: typeof payload.clinic_override.max_gemini_calls_per_run === 'number' ? payload.clinic_override.max_gemini_calls_per_run : null,
          apply_only_when_carrier_generic: payload.clinic_override.apply_only_when_carrier_generic === null ? null : Boolean(payload.clinic_override.apply_only_when_carrier_generic),
          set_verification_type_on_enrichment: payload.clinic_override.set_verification_type_on_enrichment === null ? null : Boolean(payload.clinic_override.set_verification_type_on_enrichment),
          verification_type_value: typeof payload.clinic_override.verification_type_value === 'string' ? payload.clinic_override.verification_type_value : null,
          update_filenames: payload.clinic_override.update_filenames === null ? null : Boolean(payload.clinic_override.update_filenames),
          fields_applied: isRecord(payload.clinic_override.fields_applied)
            ? payload.clinic_override.fields_applied as Record<string, boolean>
            : null,
          document_file_naming: isRecord(payload.clinic_override.document_file_naming)
            ? {
                form_with_print: payload.clinic_override.document_file_naming.form_with_print === null
                  ? null
                  : Boolean(payload.clinic_override.document_file_naming.form_with_print),
                short_form: payload.clinic_override.document_file_naming.short_form === null
                  ? null
                  : Boolean(payload.clinic_override.document_file_naming.short_form),
                effective_source: payload.clinic_override.document_file_naming.effective_source === 'clinic_override'
                  ? 'clinic_override'
                  : 'client_config',
              }
            : null,
          created_at: typeof payload.clinic_override.created_at === 'string' ? payload.clinic_override.created_at : null,
          updated_at: typeof payload.clinic_override.updated_at === 'string' ? payload.clinic_override.updated_at : null,
        }
      : null,
    inheritance: {
      source: typeof inheritanceRaw.source === 'string' ? inheritanceRaw.source : 'global_default',
      application_mode: inheritanceRaw.application_mode === 'apply' ? 'apply' : 'preview',
    },
  };
}

function buildDocumentFileNamingClientPayload(value: unknown): Record<string, boolean> {
  const payload = isRecord(value) ? value : {};
  return {
    form_with_print: Boolean(payload.form_with_print ?? true),
    short_form: Boolean(payload.short_form ?? false),
  };
}

function buildDocumentFileNamingClinicPayload(value: unknown): Record<string, boolean | null> {
  const payload = isRecord(value) ? value : {};
  return {
    form_with_print: payload.form_with_print === null ? null : Boolean(payload.form_with_print ?? true),
    short_form: payload.short_form === null ? null : Boolean(payload.short_form ?? false),
  };
}

function buildInsuranceClientPatchPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...data };
  if ('document_file_naming' in payload) {
    payload.document_file_naming = buildDocumentFileNamingClientPayload(payload.document_file_naming);
  }
  return payload;
}

function buildInsuranceClinicPatchPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload = { ...data };
  if ('inherit_all' in payload && payload.inherit_all === true) {
    return payload;
  }
  if ('document_file_naming' in payload) {
    payload.document_file_naming = buildDocumentFileNamingClinicPayload(payload.document_file_naming);
  }
  return payload;
}

function normalizeInsuranceConfigPayload(value: unknown): InsuranceEnrichmentConfigPayload {
  const payload = isRecord(value) ? value : {};
  return {
    client_id: typeof payload.client_id === 'string' ? payload.client_id : '',
    client_name: typeof payload.client_name === 'string' ? payload.client_name : '',
    defaults: normalizeInsuranceConfigShape(payload.defaults),
    client_config: isRecord(payload.client_config)
      ? {
          ...normalizeInsuranceConfigShape(payload.client_config),
          id: typeof payload.client_config.id === 'string' ? payload.client_config.id : '',
          client_id: typeof payload.client_config.client_id === 'string' ? payload.client_config.client_id : '',
          created_at: typeof payload.client_config.created_at === 'string' ? payload.client_config.created_at : null,
          updated_at: typeof payload.client_config.updated_at === 'string' ? payload.client_config.updated_at : null,
        }
      : null,
    effective_client_config: normalizeInsuranceConfigShape(payload.effective_client_config),
    clinics: Array.isArray(payload.clinics) ? payload.clinics.map(normalizeInsuranceClinicRow) : [],
    audit_trail: Array.isArray(payload.audit_trail)
      ? payload.audit_trail.map((item) => {
          const row = isRecord(item) ? item : {};
          return {
            id: typeof row.id === 'string' ? row.id : '',
            created_at: typeof row.created_at === 'string' ? row.created_at : null,
            clinic_id: typeof row.clinic_id === 'string' ? row.clinic_id : '',
            clinic_name: typeof row.clinic_name === 'string' ? row.clinic_name : '',
            mode: row.mode === 'apply' ? 'apply' : 'preview',
            rows_seen: typeof row.rows_seen === 'number' ? row.rows_seen : 0,
            rows_enriched: typeof row.rows_enriched === 'number' ? row.rows_enriched : 0,
            status: typeof row.status === 'string' ? row.status : 'ok',
            event_type: typeof row.event_type === 'string' ? row.event_type : 'insurance_enrichment_plan',
          };
        })
      : [],
  };
}

function normalizeInsurancePreviewResult(value: unknown): InsuranceEnrichmentPreviewResult {
  const payload = isRecord(value) ? value : {};
  return {
    clinic_id: typeof payload.clinic_id === 'string' ? payload.clinic_id : '',
    clinic_name: typeof payload.clinic_name === 'string' ? payload.clinic_name : undefined,
    target_date: typeof payload.target_date === 'string' ? payload.target_date : undefined,
    run_type: typeof payload.run_type === 'string' ? payload.run_type : undefined,
    enabled: Boolean(payload.enabled ?? false),
    dry_run: Boolean(payload.dry_run ?? true),
    application_mode: payload.application_mode === 'apply' ? 'apply' : 'preview',
    rows_seen: typeof payload.rows_seen === 'number' ? payload.rows_seen : 0,
    candidate_rows: typeof payload.candidate_rows === 'number' ? payload.candidate_rows : 0,
    rows_enriched: typeof payload.rows_enriched === 'number' ? payload.rows_enriched : 0,
    gemini_calls: typeof payload.gemini_calls === 'number' ? payload.gemini_calls : 0,
    sources: isRecord(payload.sources) ? payload.sources as Record<string, number> : {},
    fields_updated: isRecord(payload.fields_updated) ? payload.fields_updated as Record<string, number> : {},
    sample_changes: Array.isArray(payload.sample_changes)
      ? payload.sample_changes.filter((item): item is InsuranceEnrichmentPreviewResult['sample_changes'][number] => isRecord(item) && typeof item.patient_id === 'string' && isRecord(item.fields)).map((item) => ({
          patient_id: item.patient_id,
          sources: Array.isArray(item.sources) ? item.sources.filter((s): s is string => typeof s === 'string') : [],
          fields: item.fields as Record<string, { before: string; after: string }>,
        }))
      : [],
  };
}

function normalizeEffectivePolicy(value: unknown): ExtractionEffectivePolicy | null {
  if (!isRecord(value)) return null;
  return {
    extraction_time: typeof value.extraction_time === 'string' ? value.extraction_time : '06:00:00',
    review_times: normalizeStringArray(value.review_times),
    days_in_advance: typeof value.days_in_advance === 'number' ? value.days_in_advance : 0,
    horizon_mode: typeof value.horizon_mode === 'string' ? value.horizon_mode : 'business_days',
    working_days: normalizeNumberArray(value.working_days),
    review_day_offsets: normalizeNumberArray(value.review_day_offsets),
    slack_webhook: typeof value.slack_webhook === 'string' ? value.slack_webhook : null,
    slack_mentions: normalizeStringArray(value.slack_mentions),
    max_parallel_clinics: typeof value.max_parallel_clinics === 'number' ? value.max_parallel_clinics : 1,
    max_parallel_runs_per_clinic: typeof value.max_parallel_runs_per_clinic === 'number' ? value.max_parallel_runs_per_clinic : 1,
    timezone: typeof value.timezone === 'string' ? value.timezone : 'UTC'
  };
}

function normalizeNotificationStatus(value: unknown): ExtractionNotificationStatus {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    pending_count: typeof payload.pending_count === 'number' ? payload.pending_count : 0,
    failed_count: typeof payload.failed_count === 'number' ? payload.failed_count : 0,
    last_sent_at: typeof payload.last_sent_at === 'string' ? payload.last_sent_at : null
  };
}

function normalizeHealth(value: unknown, clinic_id = ''): ExtractionHealth {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    clinic_id: typeof payload.clinic_id === 'string' ? payload.clinic_id : clinic_id,
    status: payload.status === 'DOWN' ? 'DOWN' : payload.status === 'DEGRADED' ? 'DEGRADED' : 'HEALTHY',
    reason_code: typeof payload.reason_code === 'string' ? payload.reason_code : 'healthy',
    reason_summary: typeof payload.reason_summary === 'string' ? payload.reason_summary : null,
    consecutive_failure_count: typeof payload.consecutive_failure_count === 'number' ? payload.consecutive_failure_count : 0,
    overdue_run_count: typeof payload.overdue_run_count === 'number' ? payload.overdue_run_count : 0,
    pending_notification_count: typeof payload.pending_notification_count === 'number' ? payload.pending_notification_count : 0,
    failed_notification_count: typeof payload.failed_notification_count === 'number' ? payload.failed_notification_count : 0,
    last_success_at: typeof payload.last_success_at === 'string' ? payload.last_success_at : null,
    last_failure_at: typeof payload.last_failure_at === 'string' ? payload.last_failure_at : null,
    last_od_error_at: typeof payload.last_od_error_at === 'string' ? payload.last_od_error_at : null,
    last_event_at: typeof payload.last_event_at === 'string' ? payload.last_event_at : null,
    computed_at: typeof payload.computed_at === 'string' ? payload.computed_at : null,
    signal_snapshot_json: isRecord(payload.signal_snapshot_json) ? payload.signal_snapshot_json : {}
  };
}

function normalizeOperationEvent(value: unknown): ExtractionOperationEvent {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: typeof payload.id === 'string' ? payload.id : '',
    clinic_id: typeof payload.clinic_id === 'string' ? payload.clinic_id : '',
    extraction_run_id: typeof payload.extraction_run_id === 'string' ? payload.extraction_run_id : null,
    event_type: typeof payload.event_type === 'string' ? payload.event_type : 'unknown',
    severity: typeof payload.severity === 'string' ? payload.severity : 'INFO',
    message: typeof payload.message === 'string' ? payload.message : null,
    payload_json: isRecord(payload.payload_json) ? payload.payload_json : {},
    created_at: typeof payload.created_at === 'string' ? payload.created_at : null
  };
}

function normalizeRun(raw: ExtractionRun): ExtractionRun {
  return {
    ...raw,
    recent_events: Array.isArray(raw.recent_events) ? raw.recent_events.map(normalizeOperationEvent) : []
  };
}

function normalizeSchedule(raw: ExtractionSchedule): ExtractionSchedule {
  return {
    ...raw,
    review_times: normalizeStringArray(raw.review_times),
    working_days: normalizeNumberArray(raw.working_days).length
      ? normalizeNumberArray(raw.working_days)
      : normalizeNumberArray(raw.effective_policy?.working_days),
    review_day_offsets: normalizeNumberArray(raw.review_day_offsets),
    slack_webhook: typeof raw.slack_webhook === 'string' ? raw.slack_webhook : null,
    slack_mentions: normalizeStringArray(raw.slack_mentions),
    effective_policy: normalizeEffectivePolicy(raw.effective_policy),
    notification_status: normalizeNotificationStatus(raw.notification_status),
    health: normalizeHealth(raw.health, raw.clinic_id)
  };
}

function normalizeRolloutCheck(raw: ExtractionRolloutCheck): ExtractionRolloutCheck {
  return {
    ...raw,
    blockers: normalizeStringArray(raw.blockers),
    effective_policy: normalizeEffectivePolicy(raw.effective_policy) ?? {
      extraction_time: '06:00:00',
      review_times: [],
      days_in_advance: 0,
      horizon_mode: 'business_days',
      working_days: [],
      review_day_offsets: [],
      max_parallel_clinics: 1,
      max_parallel_runs_per_clinic: 1,
      timezone: 'UTC'
    },
    health: normalizeHealth(raw.health, raw.clinic_id),
    notification_status: normalizeNotificationStatus(raw.notification_status),
    recent_runs: Array.isArray(raw.recent_runs) ? raw.recent_runs.map(normalizeRun) : [],
    recent_events: Array.isArray(raw.recent_events) ? raw.recent_events.map(normalizeOperationEvent) : []
  };
}

function normalizeEncargado(raw: Encargado): Encargado {
  const analyticsStatus = normalizeAnalyticsStatus(raw.analytics_status);
  const normalized: Encargado = {
    ...raw,
    clinic_ids: normalizeStringArray(raw.clinic_ids),
    client_ids: normalizeStringArray(raw.client_ids),
    resolved_assignment_client_ids: normalizeStringArray(raw.resolved_assignment_client_ids),
    resolved_assignment_clinic_ids: normalizeStringArray(raw.resolved_assignment_clinic_ids),
    resolved_clinic_ownership: [],
    workload_summary: {
      resolved_client_count: 0,
      resolved_clinic_count: 0,
      direct_clinic_count: 0,
      legacy_client_count: 0
    },
    capacity: {
      status: 'unavailable',
      max_clinics: null,
      assigned_clinic_count: 0,
      available_clinic_slots: null,
      utilization_ratio: null
    },
    analytics_status: analyticsStatus
  };

  normalized.resolved_clinic_ownership = normalizeClinicOwnership(raw.resolved_clinic_ownership);
  normalized.workload_summary = normalizeWorkloadSummary(raw.workload_summary, normalized);
  normalized.capacity = normalizeCapacity(raw.capacity, normalized.clinic_ids);
  if (!analyticsStatus.missing_metrics.length) {
    analyticsStatus.missing_metrics = ['verification_volume', 'completion_rate'];
  }

  return normalized;
}

function normalizeEncargadoAnalytics(raw: EncargadoAnalytics): EncargadoAnalytics {
  const resolved_assignment_client_ids = normalizeStringArray(raw.resolved_assignment_client_ids);
  const resolved_assignment_clinic_ids = normalizeStringArray(raw.resolved_assignment_clinic_ids);
  const metricsPayload: Partial<EncargadoAnalyticsMetrics> = isRecord(raw.metrics)
    ? raw.metrics as EncargadoAnalyticsMetrics
    : {};
  const analyticsStatus = normalizeAnalyticsStatus(raw.analytics_status);

  const normalized: EncargadoAnalytics = {
    ...raw,
    resolved_assignment_client_ids,
    resolved_assignment_clinic_ids,
    resolved_clinic_ownership: normalizeClinicOwnership(raw.resolved_clinic_ownership),
    workload_summary: {
      resolved_client_count: 0,
      resolved_clinic_count: 0,
      direct_clinic_count: 0,
      legacy_client_count: 0
    },
    capacity: {
      status: 'unavailable',
      max_clinics: null,
      assigned_clinic_count: 0,
      available_clinic_slots: null,
      utilization_ratio: null
    },
    analytics_status: analyticsStatus,
    metrics: {
      client_count: typeof metricsPayload.client_count === 'number' ? metricsPayload.client_count : resolved_assignment_client_ids.length,
      clinic_count: typeof metricsPayload.clinic_count === 'number' ? metricsPayload.clinic_count : resolved_assignment_clinic_ids.length,
      verification_volume: typeof metricsPayload.verification_volume === 'number' ? metricsPayload.verification_volume : null,
      completion_rate: typeof metricsPayload.completion_rate === 'number' ? metricsPayload.completion_rate : null
    }
  };

  normalized.workload_summary = normalizeWorkloadSummary(raw.workload_summary, {
    resolved_assignment_client_ids,
    resolved_assignment_clinic_ids,
    clinic_ids: [],
    client_ids: []
  });
  normalized.capacity = normalizeCapacity(raw.capacity, []);
  if (!analyticsStatus.missing_metrics.length) {
    analyticsStatus.missing_metrics = ['verification_volume', 'completion_rate'];
  }

  return normalized;
}

function cloneEncargado(member: Encargado): Encargado {
  return JSON.parse(JSON.stringify(member)) as Encargado;
}

function cloneAnalytics(analytics: EncargadoAnalytics | undefined): EncargadoAnalytics | undefined {
  return analytics ? (JSON.parse(JSON.stringify(analytics)) as EncargadoAnalytics) : undefined;
}

function normalizeAssignClinicsResponse(raw: Encargado | AssignClinicsResponse): AssignClinicsResponse {
  if ('member' in raw && 'rollback_member' in raw && 'assignment_change' in raw) {
    return {
      member: normalizeEncargado(raw.member),
      rollback_member: normalizeEncargado(raw.rollback_member),
      assignment_change: raw.assignment_change,
    };
  }

  const normalizedMember = normalizeEncargado(raw);
  const legacyChange: EncargadoAssignmentChange = {
    encargado_id: normalizedMember.id,
    changed: true,
    requested_clinic_ids: normalizedMember.clinic_ids,
    previous_clinic_ids: [],
    added_clinic_ids: normalizedMember.clinic_ids,
    removed_clinic_ids: [],
    affected_analytics_fields: ['resolved_assignment_clinic_ids', 'resolved_clinic_ownership', 'workload_summary', 'capacity', 'analytics_status', 'metrics']
  };
  return {
    member: normalizedMember,
    rollback_member: normalizedMember,
    assignment_change: legacyChange
  };
}

export const useExtractionStore = defineStore('extraction', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const runs = ref<ExtractionRun[]>([]);
  const selectedRun = ref<ExtractionRun | null>(null);
  const schedules = ref<ExtractionSchedule[]>([]);
  const health = ref<ExtractionHealth[]>([]);
  const events = ref<ExtractionOperationEvent[]>([]);
  const rolloutChecks = ref<Record<string, ExtractionRolloutCheck>>({});
  const insuranceEnrichmentConfig = ref<InsuranceEnrichmentConfigPayload | null>(null);
  const insuranceEnrichmentPreview = ref<InsuranceEnrichmentPreviewResult | null>(null);
  const encargados = ref<Encargado[]>([]);
  const encargadoAnalytics = ref<Record<string, EncargadoAnalytics>>({});
  const selectedEncargadoId = ref<string | null>(null);
  const drawerOpen = ref(false);
  const drawerMode = ref<WorkforceDrawerMode>('closed');
  const analyticsLoadingById = ref<Record<string, boolean>>({});
  const reassignmentPendingById = ref<Record<string, boolean>>({});

  const runsPagination = ref<Pagination>({
    page: 1,
    per_page: 20,
    total: 0,
    pages: 0,
  });

  const runFilters = ref<ExtractionRunFilters>({
    page: 1,
    per_page: 20,
    status: '',
    run_type: '',
    clinic_ids: [],
  });

  const recentRuns = computed(() => runs.value.slice(0, 10));
  const selectedEncargado = computed<Encargado | null>(() => {
    if (!selectedEncargadoId.value) return null;
    return encargados.value.find((item) => item.id === selectedEncargadoId.value) ?? null;
  });

  const dashboardSummary = computed(() => {
    const total = runs.value.length;
    const completed = runs.value.filter((run) => run.status === 'COMPLETED').length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalRuns = runs.value.length;
    const appointmentsToday = runs.value.reduce((sum, run) => sum + (run.inserted_rows_count || 0), 0);
    const activeSchedules = schedules.value.filter((schedule) => schedule.auto_extract_enabled).length;

    return {
      total_runs: totalRuns,
      success_rate: successRate,
      active_schedules: activeSchedules,
      appointments_today: appointmentsToday,
    };
  });

  const healthSummary = computed(() => ({
    healthy: health.value.filter((item) => item.status === 'HEALTHY').length,
    degraded: health.value.filter((item) => item.status === 'DEGRADED').length,
    down: health.value.filter((item) => item.status === 'DOWN').length,
    notification_backlog: health.value.reduce((sum, item) => sum + item.pending_notification_count + item.failed_notification_count, 0)
  }));

  const clinicNameMap = computed<Record<string, string>>(() => {
    const clinicStore = useClinicStore();
    return (clinicStore.clinics || []).reduce((acc, clinic) => {
      acc[clinic.id] = clinic.clinic_name;
      return acc;
    }, {} as Record<string, string>);
  });

  function ensureDateRange(dateFrom?: string, dateTo?: string) {
    if (!dateFrom || !dateTo) return;
    if (new Date(dateTo) < new Date(dateFrom)) {
      throw new Error('Invalid date range: date_to cannot be before date_from');
    }
  }

  function applyRunFilters(items: ExtractionRun[], filters: ExtractionRunFilters): ExtractionRun[] {
    let filtered = [...items];

    if (filters.clinic_ids && filters.clinic_ids.length > 0) {
      const allowed = new Set(filters.clinic_ids);
      filtered = filtered.filter((item) => allowed.has(item.clinic_id));
    }

    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    if (filters.run_type) {
      filtered = filtered.filter((item) => item.run_type === filters.run_type);
    }

    if (filters.date_from) {
      const from = new Date(filters.date_from);
      filtered = filtered.filter((item) => new Date(item.target_date) >= from);
    }

    if (filters.date_to) {
      const to = new Date(filters.date_to);
      filtered = filtered.filter((item) => new Date(item.target_date) <= to);
    }

    return filtered;
  }

  async function hydrateLookups() {
    const clinicStore = useClinicStore();
    const clientStore = useClientStore();

    await Promise.all([
      clinicStore.fetchClinicCatalog({ limit: 500, includeInactive: true }),
      clientStore.fetchClients({ limit: 500, includeInactive: true }),
    ]);
  }

  async function fetchRuns(params: ExtractionRunFilters = {}) {
    loading.value = true;
    error.value = null;

    try {
      const merged = {
        ...runFilters.value,
        ...params,
      };

      ensureDateRange(merged.date_from, merged.date_to);

      const page = merged.page ?? 1;
      const perPage = merged.per_page ?? 20;
      const requestLimit = Math.min(Math.max(page * perPage, 50), 500);

      const query = new URLSearchParams();
      if (merged.clinic_ids && merged.clinic_ids.length === 1) {
        query.set('clinic_id', merged.clinic_ids[0]);
      }
      if (merged.status) query.set('status', merged.status);
      query.set('limit', String(requestLimit));

      const url = query.toString() ? `${baseUrl}/runs?${query.toString()}` : `${baseUrl}/runs`;
      const payload = await fetchWrapper.get(url) as RunsResponse | ExtractionRun[];
      const allRuns = (Array.isArray(payload) ? payload : (payload.runs ?? [])).map(normalizeRun);

      const filtered = applyRunFilters(allRuns, merged);
      const start = (page - 1) * perPage;
      const end = start + perPage;

      runs.value = filtered.slice(start, end);
      runFilters.value = merged;
      runsPagination.value = {
        page,
        per_page: perPage,
        total: filtered.length,
        pages: Math.ceil(filtered.length / perPage),
      };

      return runs.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch extraction runs');
      runs.value = [];
      runsPagination.value = { page: 1, per_page: 20, total: 0, pages: 0 };
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRunDetail(id: string) {
    loading.value = true;
    error.value = null;
    try {
      selectedRun.value = normalizeRun(await fetchWrapper.get(`${baseUrl}/runs/${id}`) as ExtractionRun);
      return selectedRun.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch extraction run detail');
      selectedRun.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function triggerExtraction(
    clinic_id: string,
    run_type: 'NEW_DATE' | 'REVIEW',
    date_from: string,
    date_to: string,
  ) {
    loading.value = true;
    error.value = null;
    try {
      ensureDateRange(date_from, date_to);
      const payload: ExtractionManualTriggerRequest = { clinic_id, run_type, date_from, date_to };
      const result = await fetchWrapper.post(baseUrl, payload) as ExtractionManualTriggerResponse;
      await fetchRuns({ page: 1, per_page: runFilters.value.per_page ?? 20 });
      return result;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to trigger extraction');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSchedules(client_id?: string) {
    loading.value = true;
    error.value = null;
    try {
      const query = new URLSearchParams();
      if (client_id) query.set('client_id', client_id);
      const url = query.toString() ? `${baseUrl}/schedules?${query.toString()}` : `${baseUrl}/schedules`;
      schedules.value = (await fetchWrapper.get(url) as ExtractionSchedule[]).map(normalizeSchedule);
      return schedules.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch extraction schedules');
      schedules.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function updateSchedule(id: string, data: Partial<ExtractionSchedule>) {
    loading.value = true;
    error.value = null;
    try {
      const updated = normalizeSchedule(await fetchWrapper.patch(`${baseUrl}/schedules/${id}`, data as Record<string, unknown>) as ExtractionSchedule);
      const idx = schedules.value.findIndex((item) => item.id === id);
      if (idx !== -1) schedules.value[idx] = updated;
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to update extraction schedule');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchHealth(clinic_id?: string) {
    loading.value = true;
    error.value = null;
    try {
      const query = new URLSearchParams();
      if (clinic_id) query.set('clinic_id', clinic_id);
      const url = query.toString() ? `${baseUrl}/health?${query.toString()}` : `${baseUrl}/health`;
      health.value = (await fetchWrapper.get(url) as ExtractionHealth[]).map((item) => normalizeHealth(item, item.clinic_id));
      return health.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch extraction health');
      health.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchEvents(clinic_id?: string, limit = 25) {
    loading.value = true;
    error.value = null;
    try {
      const query = new URLSearchParams();
      if (clinic_id) query.set('clinic_id', clinic_id);
      query.set('limit', String(limit));
      events.value = (await fetchWrapper.get(`${baseUrl}/events?${query.toString()}`) as ExtractionOperationEvent[])
        .map(normalizeOperationEvent);
      return events.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch extraction events');
      events.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchRolloutCheck(clinic_id: string) {
    loading.value = true;
    error.value = null;
    try {
      const payload = normalizeRolloutCheck(await fetchWrapper.get(`${baseUrl}/rollout-check/${clinic_id}`) as ExtractionRolloutCheck);
      rolloutChecks.value = {
        ...rolloutChecks.value,
        [clinic_id]: payload,
      };
      return payload;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch rollout check');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchInsuranceEnrichmentConfig(client_id: string) {
    loading.value = true;
    error.value = null;
    try {
      const query = new URLSearchParams({ client_id });
      insuranceEnrichmentConfig.value = normalizeInsuranceConfigPayload(
        await fetchWrapper.get(`${baseUrl}/insurance-enrichment/config?${query.toString()}`)
      );
      return insuranceEnrichmentConfig.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch insurance enrichment config');
      insuranceEnrichmentConfig.value = null;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateInsuranceEnrichmentClientConfig(client_id: string, data: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      insuranceEnrichmentConfig.value = normalizeInsuranceConfigPayload(
        await fetchWrapper.patch(`${baseUrl}/insurance-enrichment/config/${client_id}`, buildInsuranceClientPatchPayload(data))
      );
      return insuranceEnrichmentConfig.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to update insurance enrichment client config');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateInsuranceEnrichmentClinicOverride(clinic_id: string, data: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      insuranceEnrichmentConfig.value = normalizeInsuranceConfigPayload(
        await fetchWrapper.patch(`${baseUrl}/insurance-enrichment/config/clinics/${clinic_id}`, buildInsuranceClinicPatchPayload(data))
      );
      return insuranceEnrichmentConfig.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to update insurance enrichment clinic override');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function runInsuranceEnrichmentPreview(payload: {
    clinic_id: string;
    target_date: string;
    run_type: 'NEW_DATE' | 'REVIEW';
  }) {
    loading.value = true;
    error.value = null;
    try {
      insuranceEnrichmentPreview.value = normalizeInsurancePreviewResult(
        await fetchWrapper.post(`${baseUrl}/insurance-enrichment/preview`, payload)
      );
      return insuranceEnrichmentPreview.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to run insurance enrichment preview');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEncargados() {
    loading.value = true;
    error.value = null;
    try {
      const payload = await fetchWrapper.get(`${apiUrl}/encargados`) as Encargado[];
      encargados.value = payload.map(normalizeEncargado);
      if (selectedEncargadoId.value) {
        const stillSelected = encargados.value.some((item) => item.id === selectedEncargadoId.value);
        if (!stillSelected && drawerMode.value !== 'create') {
          selectedEncargadoId.value = null;
          drawerOpen.value = false;
          drawerMode.value = 'closed';
        }
      }
      return encargados.value;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch team members');
      encargados.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function createEncargado(data: { name: string; email: string; is_active?: boolean }) {
    loading.value = true;
    error.value = null;
    try {
      const created = normalizeEncargado(await fetchWrapper.post(`${apiUrl}/encargados`, data) as Encargado);
      encargados.value.unshift(created);
      return created;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to create team member');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateEncargado(id: string, data: Partial<Encargado>) {
    loading.value = true;
    error.value = null;
    try {
      const updated = normalizeEncargado(await fetchWrapper.patch(`${apiUrl}/encargados/${id}`, data as Record<string, unknown>) as Encargado);
      const idx = encargados.value.findIndex((item) => item.id === id);
      if (idx !== -1) encargados.value[idx] = updated;
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to update team member');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function assignClients(encargado_id: string, client_ids: string[]) {
    loading.value = true;
    error.value = null;
    try {
      const payload: AssignClientsRequest = { client_ids };
      const updated = normalizeEncargado(await fetchWrapper.post(`${apiUrl}/encargados/${encargado_id}/clients`, payload) as Encargado);
      const idx = encargados.value.findIndex((item) => item.id === encargado_id);
      if (idx !== -1) encargados.value[idx] = updated;
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to assign fallback clients');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function assignClinics(encargado_id: string, clinic_ids: string[]) {
    loading.value = true;
    error.value = null;
    try {
      const payload: AssignClinicsRequest = { clinic_ids };
      const response = normalizeAssignClinicsResponse(await fetchWrapper.post(`${apiUrl}/encargados/${encargado_id}/clinics`, payload) as Encargado | AssignClinicsResponse);
      const updated = response.member;
      const idx = encargados.value.findIndex((item) => item.id === encargado_id);
      if (idx !== -1) encargados.value[idx] = updated;
      if (response.assignment_change.changed) {
        const cache = { ...encargadoAnalytics.value };
        delete cache[encargado_id];
        encargadoAnalytics.value = cache;
      }
      return updated;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to assign clinics');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAnalytics(encargado_id: string) {
    error.value = null;
    try {
      const data = normalizeEncargadoAnalytics(await fetchWrapper.get(`${apiUrl}/encargados/${encargado_id}/analytics`) as EncargadoAnalytics);
      encargadoAnalytics.value = {
        ...encargadoAnalytics.value,
        [encargado_id]: data,
      };
      return data;
    } catch (err: unknown) {
      error.value = getErrorMessage(err, 'Failed to fetch workforce analytics');
      throw err;
    }
  }

  function statusColor(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'success',
      RUNNING: 'info',
      FAILED: 'error',
      PENDING: 'warning',
      SKIPPED: 'grey',
    };
    return map[status] ?? 'grey';
  }

  async function ensureWorkforceAnalytics(encargado_id: string, force = false) {
    if (!encargado_id) return null;
    if (!force && encargadoAnalytics.value[encargado_id]) {
      return encargadoAnalytics.value[encargado_id];
    }
    if (analyticsLoadingById.value[encargado_id]) {
      return encargadoAnalytics.value[encargado_id] ?? null;
    }

    analyticsLoadingById.value = {
      ...analyticsLoadingById.value,
      [encargado_id]: true,
    };
    try {
      return await fetchAnalytics(encargado_id);
    } finally {
      analyticsLoadingById.value = {
        ...analyticsLoadingById.value,
        [encargado_id]: false,
      };
    }
  }

  async function openWorkforceMember(encargado_id: string, mode: WorkforceDrawerMode = 'detail') {
    selectedEncargadoId.value = encargado_id;
    drawerMode.value = mode;
    drawerOpen.value = true;
    await ensureWorkforceAnalytics(encargado_id);
  }

  function openCreateDrawer() {
    selectedEncargadoId.value = null;
    drawerMode.value = 'create';
    drawerOpen.value = true;
  }

  function closeWorkforceDrawer() {
    drawerOpen.value = false;
    selectedEncargadoId.value = null;
    drawerMode.value = 'closed';
  }

  function setDrawerMode(mode: WorkforceDrawerMode) {
    drawerMode.value = mode;
    if (mode === 'closed') {
      drawerOpen.value = false;
      selectedEncargadoId.value = null;
    } else {
      drawerOpen.value = true;
    }
  }

  function invalidateAnalytics(encargado_id: string) {
    const cache = { ...encargadoAnalytics.value };
    delete cache[encargado_id];
    encargadoAnalytics.value = cache;
  }

  function buildOptimisticMember(previous: Encargado, clinic_ids: string[]): Encargado {
    const nextClinicIds = [...clinic_ids];
    const nextScope = nextClinicIds.length > 0
      ? 'clinic'
      : (previous.client_ids.length > 0 ? 'client' : 'unassigned');

    return {
      ...cloneEncargado(previous),
      clinic_ids: nextClinicIds,
      resolved_assignment_scope: nextScope,
      resolved_assignment_clinic_ids: nextScope === 'clinic' ? nextClinicIds : [],
      workload_summary: {
        resolved_client_count: nextScope === 'clinic'
          ? previous.resolved_assignment_client_ids?.length ?? previous.client_ids.length
          : previous.client_ids.length,
        resolved_clinic_count: nextScope === 'clinic' ? nextClinicIds.length : previous.resolved_assignment_clinic_ids?.length ?? 0,
        direct_clinic_count: nextClinicIds.length,
        legacy_client_count: previous.client_ids.length,
      },
      capacity: {
        status: previous.capacity?.status ?? 'unavailable',
        max_clinics: previous.capacity?.max_clinics ?? null,
        assigned_clinic_count: nextClinicIds.length,
        available_clinic_slots: previous.capacity?.max_clinics != null
          ? previous.capacity.max_clinics - nextClinicIds.length
          : null,
        utilization_ratio: previous.capacity?.max_clinics
          ? Number((nextClinicIds.length / previous.capacity.max_clinics).toFixed(2))
          : null,
      },
      analytics_status: {
        state: 'pending',
        missing_metrics: ['verification_volume', 'completion_rate'],
        updated_at: null,
      },
      resolved_clinic_ownership: [],
    };
  }

  async function assignClinicsOptimistic(encargado_id: string, clinic_ids: string[]) {
    const idx = encargados.value.findIndex((item) => item.id === encargado_id);
    if (idx === -1) {
      throw new Error(`Encargado '${encargado_id}' not found in store cache`);
    }

    const previousMember = cloneEncargado(encargados.value[idx]);
    const previousAnalytics = cloneAnalytics(encargadoAnalytics.value[encargado_id]);

    reassignmentPendingById.value = {
      ...reassignmentPendingById.value,
      [encargado_id]: true,
    };

    encargados.value[idx] = buildOptimisticMember(previousMember, clinic_ids);
    invalidateAnalytics(encargado_id);

    try {
      const payload: AssignClinicsRequest = { clinic_ids };
      const response = normalizeAssignClinicsResponse(
        await fetchWrapper.post(`${apiUrl}/encargados/${encargado_id}/clinics`, payload) as Encargado | AssignClinicsResponse
      );
      encargados.value[idx] = response.member;
      if (response.assignment_change.changed) {
        invalidateAnalytics(encargado_id);
      }
      if (drawerOpen.value && selectedEncargadoId.value === encargado_id) {
        await ensureWorkforceAnalytics(encargado_id, true);
      }
      return response;
    } catch (err) {
      encargados.value[idx] = previousMember;
      if (previousAnalytics) {
        encargadoAnalytics.value = {
          ...encargadoAnalytics.value,
          [encargado_id]: previousAnalytics,
        };
      }
      throw err;
    } finally {
      reassignmentPendingById.value = {
        ...reassignmentPendingById.value,
        [encargado_id]: false,
      };
    }
  }

  return {
    loading,
    error,
    runs,
    selectedRun,
    schedules,
    health,
    events,
    rolloutChecks,
    insuranceEnrichmentConfig,
    insuranceEnrichmentPreview,
    encargados,
    encargadoAnalytics,
    selectedEncargadoId,
    selectedEncargado,
    drawerOpen,
    drawerMode,
    analyticsLoadingById,
    reassignmentPendingById,
    runFilters,
    runsPagination,
    recentRuns,
    dashboardSummary,
    healthSummary,
    clinicNameMap,
    hydrateLookups,
    fetchRuns,
    fetchRunDetail,
    triggerExtraction,
    fetchSchedules,
    updateSchedule,
    fetchHealth,
    fetchEvents,
    fetchRolloutCheck,
    fetchInsuranceEnrichmentConfig,
    updateInsuranceEnrichmentClientConfig,
    updateInsuranceEnrichmentClinicOverride,
    runInsuranceEnrichmentPreview,
    fetchEncargados,
    createEncargado,
    updateEncargado,
    assignClinics,
    assignClinicsOptimistic,
    assignClients,
    fetchAnalytics,
    ensureWorkforceAnalytics,
    openWorkforceMember,
    openCreateDrawer,
    closeWorkforceDrawer,
    setDrawerMode,
    invalidateAnalytics,
    statusColor,
  };
});
