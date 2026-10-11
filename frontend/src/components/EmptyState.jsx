import React from 'react';
import { Inbox, AlertCircle } from 'lucide-react';

export default function EmptyState({
  title = 'No items found',
  description = 'Try adjusting your search query or filter options.',
  icon: Icon = Inbox,
  actionText,
  onAction,
  variant = 'default',
  className = ''
}) {
  const isError = variant === 'error';

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ${className}`}
    >
      <div
        className={`p-3 rounded-full mb-3 ${
          isError
            ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}
      >
        {isError ? (
          <AlertCircle className="w-6 h-6" aria-hidden="true" />
        ) : (
          <Icon className="w-6 h-6" aria-hidden="true" />
        )}
      </div>

      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
