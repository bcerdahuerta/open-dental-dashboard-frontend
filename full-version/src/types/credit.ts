/** Credit module domain types — shared across stores, components, and pages. */

export type CreditType =
  | 'UnappliedPayment'
  | 'Overpayment'
  | 'InsuranceOverpayment'
  | 'SuspiciousAdjustment'
  | 'TransferCredit'
  | 'Deposit'
  | 'CreditWithoutSource';

export type Severity = 'High' | 'Medium' | 'Low';

export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'VERSION_INCOMPATIBLE';

export type Disposition =
  | 'RefundImmediately'
  | 'ApplyAtNextVisit'
  | 'ContactPatient'
  | 'RecoupFromInsurance'
  | 'ManualReview';

export interface CreditSummary {
  clinic_id: string;
  run_id: string;
  run_date: string | null;
  total_patients: number;
  total_credits: number;
  total_exceptions: number;
  total_credit_amount: number;
  od_version: string | null;
}

export interface CreditRun {
  id: string;
  clinic_id: string;
  status: RunStatus;
  total_patients: number;
  total_credits: number;
  total_exceptions: number;
  total_credit_amount: number;
  od_version: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface CreditRecord {
  id: string;
  run_id: string;
  clinic_id: string;
  pat_num: number;
  guarantor_pat_num: number;
  patient_name: string | null;
  address: string | null;
  credit_amount: number;
  credit_type: CreditType;
  family_credit_total: number | null;
  guarantor_rollup_total: number | null;
  provider_num: number | null;
  has_future_appt: boolean;
  next_appt_date: string | null;
  creation_date: string | null;
  last_touched_date: string | null;
  age_days: number | null;
  age_bucket: string | null;
  credit_type_label: string;
  why_credit: string | null;
  payer_type_flags: string | null;
  status_flags: string | null;
  severity_score: Severity;
  recommended_disposition: Disposition | string;
  is_excluded: boolean;
  exclusion_reason: string | null;
  exceptions?: CreditException[];
}

export interface CreditException {
  id: string;
  record_id: string;
  run_id: string;
  flag_type: string;
  severity: Severity;
  why_flagged: string;
  details: Record<string, unknown> | null;
  created_at: string | null;
}

export interface CreditFilters {
  clinic_id?: string;
  run_id?: string;
  credit_type?: CreditType | '';
  severity?: Severity | '';
  excluded?: string;
  sort?: 'severity' | 'amount' | 'age';
  page?: number;
  per_page?: number;
}

export interface CreditRunFilters {
  clinic_id?: string;
  status?: RunStatus | '';
  page?: number;
  per_page?: number;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}
