import React from 'react';

export default function LoadingSkeleton({ variant = 'card', count = 1, className = '' }) {
  const items = Array.from({ length: count });

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
              <div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-16 mb-2"></div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ${className}`}>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48 mb-4 animate-pulse"></div>
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded flex-1"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'stepper') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-3 animate-pulse ${className}`}>
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24 mb-2"></div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`animate-pulse space-y-2 p-4 bg-slate-900 rounded-xl ${className}`}>
      <div className="h-3 bg-slate-800 rounded w-3/4"></div>
      <div className="h-3 bg-slate-800 rounded w-1/2"></div>
      <div className="h-3 bg-slate-800 rounded w-2/3"></div>
      <div className="h-3 bg-slate-800 rounded w-4/5"></div>
    </div>
  );
}
