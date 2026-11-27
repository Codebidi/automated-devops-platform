import React from 'react';
import { Activity, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

export default function HealthIndicator({ status = 'unknown', endpoint = '/health', compact = false }) {
  const isHealthy = status === 'healthy';
  const isUnknown = !status || status === 'unknown';

  const label = isHealthy ? 'Healthy' : (isUnknown ? 'Unknown' : 'Unhealthy');
  const fullLabel = isHealthy ? 'App Healthy' : (isUnknown ? 'Health Unknown' : 'Health Check Failing');

  if (compact) {
    const colorClass = isHealthy
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      : isUnknown
      ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    const dotClass = isHealthy
      ? 'bg-emerald-500 animate-pulse-subtle'
      : isUnknown
      ? 'bg-slate-400'
      : 'bg-rose-500';

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
        title={`Health check target: ${endpoint}`}
        role="status"
        aria-label={`Deployment health: ${label}`}
      >
        <span className={`w-2 h-2 rounded-full ${dotClass}`} aria-hidden="true" />
        {label}
      </span>
    );
  }

  const cardClass = isHealthy
    ? 'bg-emerald-50/60 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/40'
    : isUnknown
    ? 'bg-slate-50/60 border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-800'
    : 'bg-rose-50/60 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900/40';
  const iconClass = isHealthy
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    : isUnknown
    ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300';

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${cardClass}`}>
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-md ${iconClass}`}>
          {isHealthy ? (
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
          ) : isUnknown ? (
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {fullLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {isUnknown ? 'APP_HEALTH_URL not configured or not probed' : `Target: ${endpoint}`}
          </p>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">
        {label}
      </span>
    </div>
  );
}
