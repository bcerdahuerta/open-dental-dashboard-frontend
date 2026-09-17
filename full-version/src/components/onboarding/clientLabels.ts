/**
 * The single client-facing dictionary for the onboarding journey.
 *
 * Internal authoring names never reach user-facing copy: every screen renders one of
 * these labels instead. The closed client vocabulary is FBD/ELG, the version states,
 * the verification archetypes, and the optional note and capability names below.
 */
const CLIENT_LABELS: Record<string, string> = {
  'basic-verification@1': 'Basic verification',
  'verification-with-benefits-sync@1': 'Verification with benefits sync',
  'existing-plan-benefits-sync@1': 'Existing plan benefits sync',
  'appointment-note': 'Appointment note',
  'plan-note': 'Plan note',
  'subscriber-note': 'Subscriber note',
  'event-commlog': 'Event comm log',
  'fbd-elg-policy': 'FBD and ELG policy',
  'same-coverage-identity': 'Same coverage identity',
  'read-only-plan-context': 'Read-only plan context',
  'outcome-artifact-bundle': 'Outcome artifact bundle',
  'eligibility-last-verified': 'Eligibility last verified',
  'effective-date': 'Effective date',
  'managed-rendering': 'Managed rendering',
  BY_PLAN: 'FBD by plan',
  BY_PATIENT: 'FBD by patient',
  WINDOW_ONLY: 'ELG window only',
  WINDOW_AND_SAME_CALENDAR_YEAR: 'ELG window and same calendar year',
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  REQUIRED: 'Required and locked',
  OPTIONAL: 'Optional'
};

export const CLIENT_ARCHETYPES = ['basic-verification@1', 'verification-with-benefits-sync@1'];
export const CLIENT_OPTIONAL_NOTES = ['plan-note', 'subscriber-note', 'event-commlog'];
export const CLIENT_FBD_SCOPES = ['BY_PLAN', 'BY_PATIENT'];
export const CLIENT_CROSS_YEAR_MODES = ['WINDOW_ONLY', 'WINDOW_AND_SAME_CALENDAR_YEAR'];

/** Render any closed choice through its client label, never its internal name. */
export function clientLabel(key: string | null | undefined): string {
  if (!key) return 'Not submitted';
  return CLIENT_LABELS[key] ?? key.replace(/@[\d.]+$/, '').replace(/[-_]/g, ' ');
}
