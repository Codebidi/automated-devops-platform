import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    children,
    className = '',
    id,
    disabled = false,
    ...props
  },
  ref
) {
  const selectId = id || props.name || Math.random().toString(36).substring(2, 9);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-content-primary uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl bg-surface border text-sm text-content-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 disabled:bg-surface-subtle disabled:cursor-not-allowed pl-3.5 pr-10 py-2.5 ${
            error
              ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-500/30'
              : 'border-border-subtle hover:border-border-strong'
          } ${className}`}
          {...props}
        >
          {children}
        </select>

        <div className="absolute right-3 pointer-events-none text-content-muted">
          {error ? (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-content-muted">{hint}</p>
      ) : null}
    </div>
  );
});
