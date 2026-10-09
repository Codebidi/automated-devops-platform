import React from 'react';
import { CheckCircle2, XCircle, Loader2, MinusCircle, AlertTriangle } from 'lucide-react';

export default function StatusBadge({ status, size = 'md', showLabel = true, className = '' }) {
  const norm = (status || '').toLowerCase();

  let icon = null;
  let bg = '';
  let text = '';
  let border = '';
  let label = norm;

  switch (norm) {
    case 'success':
    case 'healthy':
    case 'passed':
      label = norm === 'healthy' ? 'Healthy' : 'Success';
      icon = <CheckCircle2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden="true" />;
      bg = 'bg-emerald-50 dark:bg-emerald-950/50';
      text = 'text-emerald-700 dark:text-emerald-300';
      border = 'border-emerald-200 dark:border-emerald-800';
      break;

    case 'failed':
    case 'unhealthy':
      label = norm === 'unhealthy' ? 'Unhealthy' : 'Failed';
      icon = <XCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden="true" />;
      bg = 'bg-rose-50 dark:bg-rose-950/50';
      text = 'text-rose-700 dark:text-rose-300';
      border = 'border-rose-200 dark:border-rose-800';
      break;

    case 'running':
    case 'in_progress':
      label = 'Running';
      icon = <Loader2 className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin`} aria-hidden="true" />;
      bg = 'bg-sky-50 dark:bg-sky-950/50';
      text = 'text-sky-700 dark:text-sky-300';
      border = 'border-sky-200 dark:border-sky-800';
      break;

    case 'skipped':
    default:
      label = 'Skipped';
      icon = <MinusCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden="true" />;
      bg = 'bg-slate-100 dark:bg-slate-800/80';
      text = 'text-slate-600 dark:text-slate-400';
      border = 'border-slate-200 dark:border-slate-700';
      break;
  }

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1.5' 
    : 'text-xs font-medium px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bg} ${text} ${border} ${sizeClasses} ${className}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </span>
  );
}
