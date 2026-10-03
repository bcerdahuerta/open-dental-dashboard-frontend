/**
 * Client-safe option normalisation for the onboarding questionnaire.
 *
 * The onboarding API has shipped two option shapes: a labelled `{ value, label }`
 * object and a bare string. Both must render as plain text; a serialized JSON form
 * is never shown to the contact.
 */
export interface NormalizedQuestionOption {
  /** Transport value kept in its original shape. */
  value: unknown;
  /** Client-facing label; always a non-empty plain string. */
  label: string;
}

function plainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => plainText(item))
      .filter((item) => item.length > 0)
      .join(', ');
  }
  return '';
}

export function normalizeQuestionOptions(options: unknown): NormalizedQuestionOption[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => {
      if (option !== null && typeof option === 'object' && !Array.isArray(option)) {
        const record = option as { value?: unknown; label?: unknown };
        const label = typeof record.label === 'string' && record.label.trim() ? record.label : plainText(record.value);
        return { value: record.value, label };
      }
      return { value: option, label: plainText(option) };
    })
    .filter((option) => option.label.length > 0);
}
