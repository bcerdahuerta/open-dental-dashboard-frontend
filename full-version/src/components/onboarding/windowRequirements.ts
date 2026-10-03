import type { OnboardingWindowAnswers, OnboardingWindowField } from '@/types/onboarding';

/** Inline hint shown on a window field the server would reject as empty. */
export const REQUIRED_WINDOW_MESSAGE = 'Answer this to continue';

/**
 * True when the server would reject this window field as empty.
 *
 * The server requires the whole window leg. `working_days` is required only in business-day
 * counting mode, and the two look-ahead numbers accept 0, so they are only missing when they are
 * not a non-negative integer.
 */
export function windowFieldMissing(answers: OnboardingWindowAnswers, field: OnboardingWindowField): boolean {
  if (field === 'look_ahead_days') return !Number.isInteger(answers.look_ahead_days) || answers.look_ahead_days < 0;
  if (field === 'day_counting') return !answers.day_counting;
  if (field === 'extraction_time') return !answers.extraction_time;
  if (field === 'review_times') return answers.review_times.length === 0;
  if (field === 'timezone') return !answers.timezone.trim();
  if (field === 'working_days') return answers.day_counting === 'BUSINESS_DAYS' && answers.working_days.length === 0;
  return false;
}

const REQUIRED_WINDOW_FIELDS: OnboardingWindowField[] = [
  'look_ahead_days',
  'day_counting',
  'working_days',
  'extraction_time',
  'review_times',
  'timezone'
];

/** The window leg the server accepts: enabled and every required field present. */
export function canSubmitWindow(answers: OnboardingWindowAnswers): boolean {
  if (answers.enabled !== true) return false;
  if (!Number.isInteger(answers.review_look_ahead_days) || answers.review_look_ahead_days < 0) return false;
  return REQUIRED_WINDOW_FIELDS.every((field) => !windowFieldMissing(answers, field));
}
