/**
 * Format a date with time for display
 * @param date - Date object or ISO string
 * @returns Formatted string like "20 Jul 2026, 03:30 PM"
 */
export function formatDateWithTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  
  return `${dateStr}, ${timeStr}`;
}

/**
 * Format a date only (no time)
 * @param date - Date object or ISO string
 * @returns Formatted string like "20 Jul 2026"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format time only
 * @param date - Date object or ISO string
 * @returns Formatted string like "03:30 PM"
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
