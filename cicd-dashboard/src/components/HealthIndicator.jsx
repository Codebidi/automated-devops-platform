import React from 'react';
import { Activity, CheckCircle, AlertTriangle } from 'lucide-react';

export default function HealthIndicator({ status = 'healthy', endpoint = '/health', compact = false }) {
  const isHealthy = status === 'healthy';

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          isHealthy
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        }`}
        title={`Health check target: ${endpoint}`}
        role="status"
        aria-label={`Deployment health: ${isHealthy ? 'Healthy' : 'Unhealthy'}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isHealthy ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-rose-500'
          }`}
          aria-hidden="true"
        />
        {isHealthy ? 'Healthy' : 'Unhealthy'}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        isHealthy
          ? 'bg-emerald-50/60 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/40'
          : 'bg-rose-50/60 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900/40'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`p-1.5 rounded-md ${
            isHealthy
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
          }`}
        >
          {isHealthy ? (
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {isHealthy ? 'App Healthy' : 'Health Check Failing'}
            </span>
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                isHealthy ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              aria-hidden="true"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            GET {endpoint} &bull; HTTP 200 OK
          </p>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">
        Live Probe
      </span>
    </div>
  );
}
