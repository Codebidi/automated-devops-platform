import React from 'react';

export function Card({
  children,
  variant = 'default',
  hoverable = false,
  className = '',
  ...props
}) {
  const baseStyles = 'rounded-2xl transition-all duration-200';

  const variants = {
    default:
      'bg-surface dark:bg-surface border border-border-subtle shadow-card',
    elevated:
      'bg-surface-elevated dark:bg-surface-elevated border border-border-subtle shadow-elevated',
    glass:
      'glass-card shadow-elevated',
    subtle:
      'bg-surface-subtle dark:bg-surface-subtle border border-border-subtle',
  };

  const hoverStyles = hoverable
    ? 'hover:-translate-y-0.5 hover:shadow-elevated hover:border-border-brand/40'
    : '';

  return (
    <div
      className={`${baseStyles} ${variants[variant] || variants.default} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
