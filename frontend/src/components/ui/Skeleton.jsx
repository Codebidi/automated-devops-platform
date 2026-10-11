import React from 'react';

export function Skeleton({
  variant = 'text',
  className = '',
  count = 1,
  ...props
}) {
  const base =
    'relative overflow-hidden bg-slate-200/80 dark:bg-slate-800/80 rounded-lg before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent';

  const variants = {
    text: 'h-4 w-full rounded-md',
    title: 'h-6 w-3/4 rounded-lg',
    avatar: 'h-10 w-10 rounded-full',
    badge: 'h-5 w-16 rounded-md',
    button: 'h-9 w-24 rounded-xl',
    card: 'h-36 w-full rounded-2xl',
  };

  if (count > 1) {
    return (
      <div className="space-y-2.5 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${base} ${variants[variant] || ''} ${className}`}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${base} ${variants[variant] || ''} ${className}`}
      {...props}
    />
  );
}
