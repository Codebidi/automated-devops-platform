/**
 * Utility functions for formatting commit SHAs, durations, and status styles
 */

export function formatSha(sha, length = 7) {
  if (!sha) return '—';
  return sha.slice(0, length);
}

export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${mins}m ${remainingSecs}s`;
}

export function getStatusConfig(status) {
  const norm = (status || '').toLowerCase();
  switch (norm) {
    case 'success':
    case 'healthy':
    case 'passed':
      return {
        label: 'Success',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        badgeColor: 'emerald',
        dot: 'bg-emerald-500'
      };
    case 'failed':
    case 'unhealthy':
      return {
        label: 'Failed',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800',
        badgeColor: 'rose',
        dot: 'bg-rose-500'
      };
    case 'running':
    case 'in_progress':
      return {
        label: 'Running',
        bg: 'bg-sky-50 dark:bg-sky-950/40',
        text: 'text-sky-700 dark:text-sky-300',
        border: 'border-sky-200 dark:border-sky-800',
        badgeColor: 'sky',
        dot: 'bg-sky-500 animate-ping'
      };
    case 'skipped':
    default:
      return {
        label: 'Skipped',
        bg: 'bg-slate-100 dark:bg-slate-800/60',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        badgeColor: 'slate',
        dot: 'bg-slate-400'
      };
  }
}
