import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendUp = true,
  className = ''
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" aria-hidden="true">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trendUp
                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50'
                : 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {subtext}
        </p>
      )}
    </div>
  );
}
