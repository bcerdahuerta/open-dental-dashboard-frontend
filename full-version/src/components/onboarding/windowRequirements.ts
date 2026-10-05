import type { ExtractionWindowSettings, OnboardingWindowField } from '@/types/onboarding';

export const REQUIRED_WINDOW_MESSAGE = 'Answer this to continue';
export const TIMEZONE_OPTIONS = [
  { title: 'Eastern Time (EST/EDT)', value: 'America/New_York' },
  { title: 'Central Time (CST/CDT)', value: 'America/Chicago' },
  { title: 'Mountain Time (MST/MDT)', value: 'America/Denver' },
  { title: 'Pacific Time (PST/PDT)', value: 'America/Los_Angeles' },
  { title: 'Arizona (MST, no daylight saving time)', value: 'America/Phoenix' }
];
export function timezoneLabel(value?: string): string {
  return TIMEZONE_OPTIONS.find(item => item.value === value)?.title ?? value ?? 'Not selected';
}
const timeValid = (value?: string) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function windowFieldMissing(answers: ExtractionWindowSettings, field: OnboardingWindowField): boolean {
  if (field === 'look_ahead_days') return !Number.isInteger(answers.look_ahead_days) || (answers.look_ahead_days ?? -1) < 0;
  if (field === 'day_counting') return !['BUSINESS_DAYS', 'CALENDAR_DAYS'].includes(answers.day_counting ?? '');
  if (field === 'extraction_time') return !timeValid(answers.extraction_time);
  if (field === 'review_times') return !answers.review_times?.length || !answers.review_times.every(timeValid);
  if (field === 'timezone') return !answers.timezone?.trim();
  if (field === 'working_days') return answers.day_counting === 'BUSINESS_DAYS' && !answers.working_days?.length;
  return false;
}

/** Completeness for this section only; never submission or activation authority. */
export function canSubmitWindow(answers: ExtractionWindowSettings): boolean {
  return (['look_ahead_days', 'day_counting', 'working_days', 'extraction_time', 'review_times', 'timezone'] as OnboardingWindowField[])
    .every(field => !windowFieldMissing(answers, field));
}
