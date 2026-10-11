import React, { forwardRef } from 'react';
import { AlertCircle, X } from 'lucide-react';

export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    leftIcon,
    rightIcon,
    onClear,
    className = '',
    id,
    disabled = false,
    ...props
  },
  ref
) {
  const inputId = id || props.name || Math.random().toString(36).substring(2, 9);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-content-primary uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 pointer-events-none text-content-muted">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`w-full rounded-xl bg-surface border text-sm text-content-primary placeholder:text-content-muted/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 disabled:bg-surface-subtle disabled:cursor-not-allowed ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightIcon || onClear || error ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-500/30'
              : 'border-border-subtle hover:border-border-strong'
          } ${className}`}
          {...props}
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {onClear && props.value && (
            <button
              type="button"
              onClick={onClear}
              className="p-1 text-content-muted hover:text-content-primary rounded transition-colors"
              aria-label="Clear field"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {error ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            rightIcon && <div className="text-content-muted">{rightIcon}</div>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-content-muted">{hint}</p>
      ) : null}
    </div>
  );
});
