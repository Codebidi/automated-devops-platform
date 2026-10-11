import React from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-border-strong bg-surface-subtle/30 dark:bg-surface-subtle/10 ${className}`}
    >
      <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-100 dark:from-brand-950/40 dark:to-indigo-900/30 border border-brand-200/50 dark:border-brand-800/40 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm">
        {icon || (
          <svg
            className="w-8 h-8 opacity-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <path d="M7 8h10M7 12h4" opacity="0.6" />
          </svg>
        )}
      </div>

      <h4 className="text-base font-heading font-semibold text-content-primary">
        {title}
      </h4>

      {description && (
        <p className="mt-1 text-sm text-content-secondary max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
