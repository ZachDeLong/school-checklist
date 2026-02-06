/**
 * Parses a date string as a local date to avoid timezone issues.
 * Extracts the date portion (YYYY-MM-DD) and creates a Date object in local time.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a due date for display with relative labels (Today, Tomorrow) or
 * a formatted date string for other dates.
 */
export function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = parseLocalDate(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Returns a CSS class name based on the due status of a task.
 */
export function getDueStatus(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = parseLocalDate(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date < today) return 'overdue';
  if (date.getTime() === today.getTime()) return 'due-today';
  if (date.getTime() === tomorrow.getTime()) return 'due-soon';
  return '';
}

/**
 * Checks if a date string represents today's date.
 */
export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = parseLocalDate(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() === today.getTime();
}

/**
 * Checks if a date string is within the next N days OR is overdue (past due).
 * Overdue tasks always return true so they appear in the urgent section.
 */
export function isWithinDays(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false;
  const date = parseLocalDate(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Overdue tasks always qualify
  if (date < today) return true;

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  return date < cutoff;
}

/**
 * Formats a date string for short display (e.g., "Feb 15").
 * Used in TaskInput for displaying selected due dates.
 */
export function formatDisplayDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Converts a Date object to a local date string in YYYY-MM-DD format.
 * Used for Canvas API date parameters.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
