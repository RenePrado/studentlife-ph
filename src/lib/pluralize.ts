/**
 * Returns a count + label string with correct singular/plural form.
 * @param count - The number of items
 * @param singular - Singular form (e.g., "session")
 * @param plural - Optional explicit plural (e.g., "classes"). Defaults to singular + "s".
 * @returns e.g., "1 session", "3 sessions", "2 classes"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const pluralForm = plural ?? `${singular}s`;
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
